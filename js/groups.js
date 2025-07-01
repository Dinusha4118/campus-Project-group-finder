import { db, auth } from './firebase.js';
import {
  collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc,
  arrayUnion, arrayRemove, serverTimestamp, orderBy
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// DOM elements
const submitGroupBtn = document.getElementById('submitGroupBtn');
const createGroupModal = document.getElementById('createGroupModal');
const createGroupForm = document.getElementById('createGroupForm');
const groupsGrid = document.querySelector('.groups-grid');
const filterTabs = document.querySelectorAll('.filter-tab');
const departmentFilter = document.getElementById('departmentFilter');
const skillFilter = document.getElementById('skillFilter');

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = user;
    setupEventListeners();
    await loadGroups();
  });
});

function setupEventListeners() {
  if (submitGroupBtn) {
    submitGroupBtn.addEventListener('click', () => createGroupModal.classList.add('active'));
  }
  if (createGroupForm) {
    createGroupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createGroup();
    });
  }
  const cancelGroupBtn = document.getElementById('cancelGroupBtn');
  if (cancelGroupBtn) {
    cancelGroupBtn.addEventListener('click', () => createGroupModal.classList.remove('active'));
  }
  const modalClose = document.querySelector('.modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => createGroupModal.classList.remove('active'));
  }
  filterTabs.forEach(tab => {
    // Hide the pending tab as it's no longer used
    if (tab.dataset.filter === 'pending') {
        tab.style.display = 'none';
    }
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadGroups();
    });
  });
  if (departmentFilter) departmentFilter.addEventListener('change', loadGroups);
  if (skillFilter) skillFilter.addEventListener('input', loadGroups);
}

async function loadGroups() {
  const activeTab = document.querySelector('.filter-tab.active');
  const filter = activeTab?.dataset.filter || 'all';
  const department = departmentFilter?.value || '';
  const skill = skillFilter?.value.toLowerCase() || '';

  let q = collection(db, 'groups');

  try {
    // Filtering Logic
    if (filter === 'my') {
      q = query(q, where('members', 'array-contains', currentUser.uid), orderBy('createdAt', 'desc'));
    } else if (filter === 'recommended') {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        if (userData?.skills?.length > 0) {
            // Firestore doesn't support multiple array-contains-any, so we fetch based on department first
            q = query(q, where('department', '==', userData.department), orderBy('createdAt', 'desc'));
        } else {
             q = query(q, orderBy('createdAt', 'desc'));
        }
    } else { // 'all'
      q = query(q, orderBy('createdAt', 'desc'));
    }

    if (department) {
      q = query(q, where('department', '==', department));
    }

    const snapshot = await getDocs(q);
    groupsGrid.innerHTML = ''; // Clear previous results

    if (snapshot.empty) {
      groupsGrid.innerHTML = '<p class="no-groups">No groups found matching your criteria.</p>';
      return;
    }

    let groupDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Client-side filtering for skills (more flexible)
    if (skill) {
      groupDocs = groupDocs.filter(group => 
        group.requiredSkills?.some(s => s.toLowerCase().includes(skill))
      );
    }
    // For recommendations, further filter by skills
    if (filter === 'recommended') {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        if(userData.skills) {
            groupDocs = groupDocs.filter(group => group.requiredSkills?.some(s => userData.skills.includes(s)));
        }
    }

    if (groupDocs.length === 0) {
        groupsGrid.innerHTML = '<p class="no-groups">No groups found matching your criteria.</p>';
        return;
    }
    
    groupDocs.forEach(group => renderGroupCard(group));

  } catch (error) {
    console.error("Error loading groups:", error);
    if(error.code === 'failed-precondition') {
        groupsGrid.innerHTML = '<p class="error">This query requires a Firestore index. Please check the console (F12) for a link to create it.</p>';
    } else {
        groupsGrid.innerHTML = '<p class="error">Failed to load groups. Please try again.</p>';
    }
  }
}

function renderGroupCard(group) {
  const groupCard = document.createElement('div');
  groupCard.className = 'group-card';
  groupCard.innerHTML = `
    <div class="group-header">
      
      <div class="group-meta">
        <h3>${group.name}</h3>
        <div class="group-stats">
          <span><i class="fas fa-users"></i> ${group.members.length}/${group.maxMembers}</span>
          <span><i class="fas fa-graduation-cap"></i> ${formatDepartment(group.department)}</span>
        </div>
      </div>
    </div>
    <p class="group-description">${group.description || 'No description provided.'}</p>
    <div class="skill-tags">${(group.requiredSkills || []).map(s => `<span>${s}</span>`).join('')}</div>
    <div class="group-footer">
      <div class="group-members">
          ${group.members.slice(0, 4).map(() => `<div class="member-avatar-sm"></div>`).join('')}
          ${group.members.length > 4 ? `<div class="member-more">+${group.members.length - 4}</div>` : ''}
      </div>
      ${getActionButton(group)}
    </div>`;

  groupCard.querySelector('.group-action-btn')?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent card click event
    handleGroupAction(group.id, e.target.dataset.action);
  });

  groupCard.addEventListener('click', () => {
    window.location.href = `group-details.html?id=${group.id}`;
  });

  groupsGrid.appendChild(groupCard);
}

function getActionButton(group) {
  if (group.members.includes(currentUser.uid)) {
    return `<button class="btn btn-outline group-action-btn" data-action="view">View</button>`;
  }
  if (group.members.length >= group.maxMembers) {
    return `<button class="btn btn-outline" disabled>Full</button>`;
  }
  return `<button class="btn btn-primary group-action-btn" data-action="join">Join</button>`;
}

async function handleGroupAction(groupId, action) {
  const groupRef = doc(db, 'groups', groupId);
  try {
    if (action === 'join') {
      await updateDoc(groupRef, { members: arrayUnion(currentUser.uid) });
      showAlert('You have joined the group!', 'success');
    } else if (action === 'view') {
      window.location.href = `group-details.html?id=${groupId}`;
      return;
    }
    loadGroups(); // Refresh the list
  } catch (err) {
    console.error('Group action error:', err);
    showAlert('Action failed. Please try again.', 'error');
  }
}

async function createGroup() {
  const name = createGroupForm['groupName'].value.trim();
  const description = createGroupForm['groupDescription'].value.trim();
  const department = createGroupForm['groupDepartment'].value;
  const maxMembers = parseInt(createGroupForm['groupMaxMembers'].value);
  const requiredSkills = createGroupForm['groupSkills'].value.split(',').map(s => s.trim()).filter(Boolean);

  if (!name || !department || !maxMembers) {
    showAlert('Name, department, and max members are required.', 'error');
    return;
  }

  try {
    await addDoc(collection(db, 'groups'), {
      name, description, department, maxMembers, requiredSkills,
      creator: currentUser.uid,
      members: [currentUser.uid], // Creator is automatically a member
      createdAt: serverTimestamp(),
      avatar: 'https://via.placeholder.com/80' // Placeholder avatar
    });
    createGroupModal.classList.remove('active');
    createGroupForm.reset();
    showAlert('Group created successfully!', 'success');
    loadGroups();
  } catch (error) {
    console.error('Create group error:', error);
    showAlert('Failed to create group.', 'error');
  }
}

// Helper functions
function formatDepartment(dept) {
  const departments = {
    'computer_science': 'Computer Science',
    'information_technology': 'Information Technology',
    'electrical_engineering': 'Electrical Engineering',
    'business_administration': 'Business Administration',
    'cybersecurity': 'Cybersecurity'
  };
  return departments[dept] || dept;
}

function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}