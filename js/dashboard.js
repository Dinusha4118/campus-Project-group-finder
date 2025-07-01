import { db, auth } from './firebase.js';
import {
    collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion,setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// --- DOM Elements ---
// Your existing elements
const welcomeBannerName = document.querySelector('.welcome-content h3');
const myGroupsList = document.querySelector('.group-list');
const deadlinesList = document.querySelector('.deadline-list');
const recommendationsList = document.querySelector('.recommendation-list');
const activityList = document.querySelector('.activity-list');

// NEW: Elements for the user profile in the sidebar
const userProfileAvatar = document.getElementById('user-profile-avatar');
const userProfileName = document.getElementById('user-profile-name');
const userProfileInfo = document.getElementById('user-profile-info');


// --- State Variables ---
let currentUser = null;
let userData = null;


// --- Initialize Dashboard ---z
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            // If the user document exists, load it and update the UI
            userData = userDoc.data();
            updateUserUI(userData);
        } else {
            // --- THIS IS THE NEW, ROBUST LOGIC ---
            // If the user document does NOT exist, create a basic one.
            console.warn("User document not found in Firestore. Creating a basic profile.");

            // Create a basic data object using info from the Auth user object
            const newUserProfileData = {
                name: user.displayName || user.email.split('@')[0], // Use display name or part of email
                email: user.email,
                photoURL: user.photoURL || 'images/default-avatar.png', // Use auth photo or default
                department: user.department, // Leave empty for user to fill later
                batch: '',
                skills: [],
                createdAt: serverTimestamp()
            };

            // Save this new basic document to Firestore
            await setDoc(userDocRef, newUserProfileData);

            // Now use this new data to update the UI
            userData = newUserProfileData;
            updateUserUI(userData);
        }

        // Load the rest of the dashboard sections
        loadMyGroups();
        loadUpcomingDeadlines();
        loadRecommendedGroups();
        loadRecentActivity();
    });
});

/**
 * NEW: Updates all parts of the UI with the user's data.
 * @param {object} data The user's data from Firestore.
 */
function updateUserUI(data) {
    const firstName = data.name ? data.name.split(' ')[0] : 'User';
    
    if (welcomeBannerName) welcomeBannerName.textContent = `Welcome back, ${firstName}!`;
    if (userProfileName) userProfileName.textContent = data.name || "Unnamed User";
    if (userProfileAvatar) userProfileAvatar.src = data.photoURL || 'images/default-avatar.png';
    if (userProfileInfo) userProfileInfo.textContent = data.department || '';
    
}


// --- Data Loading Functions ---

async function loadMyGroups() {
    if (!myGroupsList) return;
    const groupsQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', currentUser.uid)
    );

    const querySnapshot = await getDocs(groupsQuery);
    myGroupsList.innerHTML = ''; // Clear previous content

    querySnapshot.forEach(docSnap => {
        const group = { id: docSnap.id, ...docSnap.data() };
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
        groupItem.innerHTML = `
            
            <div class="group-info">
                <h5>${group.name}</h5>
                <p>${formatDepartment(group.department)} • ${group.members.length}/${group.maxMembers} members</p>
            </div>
            <div class="group-status">
                <span class="badge badge-active">Active</span>
            </div>
        `;
        groupItem.addEventListener('click', () => {
            window.location.href = `group-details.html?id=${group.id}`;
        });
        myGroupsList.appendChild(groupItem);
    });
}

// NOTE: This is still using hardcoded sample data.
async function loadUpcomingDeadlines() {
    if (!deadlinesList) return;
    deadlinesList.innerHTML = '';
    // Sample data - replace with real data from Firestore in the future
    const sampleDeadlines = [
        { day: '15', month: 'Jul', title: 'Project Proposal Due', group: 'Final Year Project', status: 'urgent' },
        { day: '28', month: 'Jul', title: 'Mid-term Presentation', group: 'Advanced AI Research', status: 'warning' },
    ];
    sampleDeadlines.forEach(deadline => {
         const deadlineItem = document.createElement('div');
         deadlineItem.className = 'deadline-item';
         deadlineItem.innerHTML = `
            <div class="deadline-date"><span class="day">${deadline.day}</span><span class="month">${deadline.month}</span></div>
            <div class="deadline-info"><h5>${deadline.title}</h5><p>${deadline.group}</p></div>
            <div class="deadline-actions"><span class="badge badge-${deadline.status}">${deadline.status.charAt(0).toUpperCase() + deadline.status.slice(1)}</span></div>
        `;
        deadlinesList.appendChild(deadlineItem);
    });
}

async function loadRecommendedGroups() {
    if (!recommendationsList || !userData?.skills?.length) return;

    const groupsQuery = query(
        collection(db, 'groups'),
        where('department', '==', userData.department),
        where('requiredSkills', 'array-contains-any', userData.skills)
    );
    const querySnapshot = await getDocs(groupsQuery);
    recommendationsList.innerHTML = '';

    querySnapshot.forEach(docSnap => {
        const group = { id: docSnap.id, ...docSnap.data() };
        
        // Don't recommend groups the user is already in
        if (group.members.includes(currentUser.uid)) return;

        const recommendationItem = document.createElement('div');
        recommendationItem.className = 'recommendation-item';
        recommendationItem.innerHTML = `
            <div class="recommendation-avatar"><img src="${group.avatar || 'images/default-avatar.png'}" alt="Group Avatar"></div>
            <div class="recommendation-info">
                <h5>${group.name}</h5>
                <p>${formatDepartment(group.department)} • ${group.members.length}/${group.maxMembers} members</p>
                <div class="skill-tags">${group.requiredSkills.slice(0, 3).map(skill => `<span>${skill}</span>`).join('')}</div>
            </div>
            <div class="recommendation-actions">
                <button class="btn btn-sm btn-primary join-btn" data-group-id="${group.id}">Join</button>
            </div>
        `;

        const joinBtn = recommendationItem.querySelector('.join-btn');
        joinBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click event
            joinBtn.disabled = true;
            try {
                // MODIFIED: This now performs a DIRECT JOIN instead of sending a request.
                await updateDoc(doc(db, 'groups', group.id), {
                    members: arrayUnion(currentUser.uid)
                });
                showAlert('Successfully joined the group!', 'success');
                // Refresh both lists to show the change
                loadMyGroups();
                loadRecommendedGroups();
            } catch (error) {
                console.error('Join group error:', error);
                showAlert('Failed to join group. Please try again.', 'error');
                joinBtn.disabled = false;
            }
        });

        recommendationsList.appendChild(recommendationItem);
    });
}

// NOTE: This is still using hardcoded sample data.
async function loadRecentActivity() {
    if (!activityList) return;
    activityList.innerHTML = '';
    const sampleActivities = [
        { icon: 'comment', content: '<strong>Sarah</strong> commented on <strong>AI Research Proposal</strong>', time: '2 hours ago' },
        { icon: 'user-plus', content: '<strong>Michael</strong> joined <strong>Web Development Project</strong>', time: '1 day ago' },
    ];
    sampleActivities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon"><i class="fas fa-${activity.icon}"></i></div>
            <div class="activity-content"><p>${activity.content}</p><span class="activity-time">${activity.time}</span></div>
        `;
        activityList.appendChild(activityItem);
    });
}


// --- Helper Functions ---

// REMOVED: The checkForPendingRequests function is no longer needed in a direct-join system.

function formatDepartment(dept) {
    const departments = {
        'computer_science': 'Computer Science',
        'information_technology': 'Information Technology',
        'software_engineering': 'Software Engineering',
        'business_administration': 'Business Administration',
        'cybersecurity': 'Cybersecurity'
    };
    return departments[dept] || dept || 'No Department';
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    const container = document.querySelector('.dashboard-content') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 5000);
}