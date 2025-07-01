import { db, auth } from './firebase.js';

import {

    doc, getDoc, updateDoc, arrayUnion, arrayRemove,

    collection, addDoc, serverTimestamp,

    query, where, getDocs, orderBy, limit, deleteDoc

} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";



// DOM elements

const groupName = document.getElementById('group-name');

const groupTopic = document.getElementById('group-topic');

const groupDescription = document.getElementById('group-description');

const groupDepartment = document.getElementById('group-department');

const groupMembers = document.getElementById('group-members');

const groupSkills = document.getElementById('group-skills');

const joinLeaveBtn = document.getElementById('join-leave-btn');

const messageForm = document.getElementById('message-form');

const messagesContainer = document.getElementById('messages-container');

const taskForm = document.getElementById('task-form');

const tasksList = document.getElementById('tasks-list');



// Current user and group data

let currentUser = null;

let groupData = null;

let groupId = null;



// Auth state listener

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = 'login.html';

        return;

    }



    currentUser = user;



    const urlParams = new URLSearchParams(window.location.search);

    groupId = urlParams.get('id');



    if (!groupId) {

        window.location.href = 'groups.html';

        return;

    }



    await loadGroupData();

    loadMessages();

    loadTasks();



    if (messageForm) {

        messageForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            await sendMessage();

        });

    }



    if (taskForm) {

        taskForm.addEventListener('submit', async (e) => {

            e.preventDefault();

            await createTask();

        });

    }



    if (joinLeaveBtn) {

        joinLeaveBtn.addEventListener('click', handleJoinLeave);

    }

});



const deleteBtn = document.getElementById('delete-group-btn');

const editBtn = document.getElementById('edit-group-btn');



if (deleteBtn) {

    deleteBtn.addEventListener('click', async () => {

        if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {

            try {

                await deleteDoc(doc(db, 'groups', groupId));

                showAlert('Group deleted successfully.', 'success');

                setTimeout(() => window.location.href = 'groups.html', 1000);

            } catch (err) {

                console.error('Error deleting group:', err);

                showAlert('Failed to delete group.', 'error');

            }

        }

    });

}



if (editBtn) {

    editBtn.addEventListener('click', () => {

        const newName = prompt('Enter new group name:', groupData.name);

        const newTopic = prompt('Enter new project topic:', groupData.topic);

        const newDesc = prompt('Enter new description:', groupData.description);



        if (newName && newTopic && newDesc) {

            updateDoc(doc(db, 'groups', groupId), {

                name: newName,

                topic: newTopic,

                description: newDesc

            })

            .then(() => {

                showAlert('Group details updated.', 'success');

                loadGroupData();

            })

            .catch(err => {

                console.error('Update failed:', err);

                showAlert('Failed to update group details.', 'error');

            });

        }

    });

}



async function loadGroupData() {

    try {

        const groupDoc = await getDoc(doc(db, 'groups', groupId));

        if (!groupDoc.exists()) {

            window.location.href = 'groups.html';

            return;

        }



        groupData = groupDoc.data();

        groupData.id = groupDoc.id;



        groupName.textContent = groupData.name || 'Unnamed';

        groupTopic.textContent = groupData.topic || 'No topic';

        groupDescription.textContent = groupData.description || 'No description';

        groupDepartment.textContent = formatDepartment(groupData.department) || 'N/A';

        groupSkills.innerHTML = (groupData.requiredSkills || []).map(skill => `<span>${skill}</span>`).join('');



        groupMembers.innerHTML = '';



        const memberPromises = (groupData.members || []).map(async memberId => {

            const memberDoc = await getDoc(doc(db, 'users', memberId));

            if (!memberDoc.exists()) return null;



            const member = memberDoc.data();

            return `

                <div class="member">

                    

                    <div class="member-info">

                        <h5>${member.name}</h5>

                        <p>${formatDepartment(member.department)} • ${member.batch}</p>

                        <div class="member-skills">

                            ${(member.skills || []).slice(0, 3).map(skill => `<span>${skill}</span>`).join('')}

                        </div>

                    </div>

                </div>`;

        });



        const memberElements = (await Promise.all(memberPromises)).filter(Boolean);

        if (memberElements.length) {

            groupMembers.innerHTML = memberElements.join('');

        } else {

            groupMembers.innerHTML = '<p>No members yet.</p>';

        }



        // Update join/leave button

        if (groupData.members.includes(currentUser.uid)) {

            joinLeaveBtn.textContent = 'Leave Group';

            joinLeaveBtn.className = 'btn btn-danger';

        } else if (groupData.members.length >= groupData.maxMembers) {

            joinLeaveBtn.textContent = 'Group Full';

            joinLeaveBtn.className = 'btn btn-outline';

            joinLeaveBtn.disabled = true;

        } else {

            joinLeaveBtn.textContent = 'Join Group';

            joinLeaveBtn.className = 'btn btn-primary';

            joinLeaveBtn.disabled = false;

        }

    } catch (err) {

        console.error('Failed to load group data', err);

        showAlert('Unable to load group. Try again later.', 'error');

    }

}



async function handleJoinLeave() {

    const groupRef = doc(db, 'groups', groupId);

    try {

        if (groupData.members.includes(currentUser.uid)) {

            // Leave group

            await updateDoc(groupRef, { 

                members: arrayRemove(currentUser.uid) 

            });

            showAlert('You have left the group', 'success');

            window.location.href = 'groups.html';

        } else {

            // Join group

            await updateDoc(groupRef, { 

                members: arrayUnion(currentUser.uid) 

            });

            showAlert('You have joined the group', 'success');

            await loadGroupData();

        }

    } catch (err) {

        console.error('Join/Leave error:', err);

        showAlert('Action failed. Try again.', 'error');

    }

}



// Helper function to format department names

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

async function sendMessage() {

    const messageInput = messageForm.querySelector('#message-input');

    const message = messageInput.value.trim();

    if (!message) return;



    try {

        await addDoc(collection(db, 'groups', groupId, 'messages'), {

            text: message,

            sender: currentUser.uid,

            createdAt: serverTimestamp()

        });



        messageInput.value = '';

        loadMessages();

    } catch (err) {

        console.error('Send message error:', err);

        showAlert('Could not send message.', 'error');

    }

}



async function loadMessages() {

    const messagesQuery = query(

        collection(db, 'groups', groupId, 'messages'),

        orderBy('createdAt', 'desc'),

        limit(50)

    );



    const querySnapshot = await getDocs(messagesQuery);

    const messages = [];



    querySnapshot.forEach(doc => {

        messages.unshift({ id: doc.id, ...doc.data() });

    });



    const senderPromises = messages.map(async (msg) => {

        const senderDoc = await getDoc(doc(db, 'users', msg.sender));

        const sender = senderDoc.exists() ? senderDoc.data() : { name: 'Unknown', photoURL: '' };

        return { ...msg, sender };

    });



    const enrichedMessages = await Promise.all(senderPromises);

    messagesContainer.innerHTML = '';



    for (const message of enrichedMessages) {

        const msgEl = document.createElement('div');

        msgEl.className = `message ${message.sender.uid === currentUser.uid ? 'sent' : 'received'}`;

        msgEl.innerHTML = `

            

            <div class="message-content">

                <div class="message-sender">${message.sender.name}</div>

                <div class="message-text">${message.text}</div>

                <div class="message-time">${formatTime(message.createdAt?.toDate?.())}</div>

            </div>

        `;

        messagesContainer.appendChild(msgEl);

    }



    messagesContainer.scrollTop = messagesContainer.scrollHeight;

}



async function createTask() {

    const title = taskForm.querySelector('#task-title').value.trim();

    const description = taskForm.querySelector('#task-description').value.trim();

    const dueDate = taskForm.querySelector('#task-due-date').value;



    if (!title) return;



    try {

        await addDoc(collection(db, 'groups', groupId, 'tasks'), {

            title,

            description,

            dueDate,

            completed: false,

            createdBy: currentUser.uid,

            createdAt: serverTimestamp()

        });



        taskForm.reset();

        showAlert('Task created successfully!', 'success');

        loadTasks();

    } catch (err) {

        console.error('Create task error:', err);

        showAlert('Failed to create task.', 'error');

    }

}



async function loadTasks() {

    const tasksQuery = query(

        collection(db, 'groups', groupId, 'tasks'),

        orderBy('dueDate'),

        orderBy('completed')

    );



    const querySnapshot = await getDocs(tasksQuery);

    tasksList.innerHTML = '';



    const taskElements = await Promise.all(querySnapshot.docs.map(async (docSnap) => {

        const task = { id: docSnap.id, ...docSnap.data() };

        const creatorDoc = await getDoc(doc(db, 'users', task.createdBy));

        const creator = creatorDoc.exists() ? creatorDoc.data() : { name: 'Unknown' };



        const el = document.createElement('div');

        el.className = `task ${task.completed ? 'completed' : ''}`;

        el.innerHTML = `

            <div class="task-checkbox">

                <input type="checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">

            </div>

            <div class="task-content">

                <h5>${task.title}</h5>

                <p>${task.description}</p>

                <div class="task-meta">

                    <span><i class="fas fa-user"></i> ${creator.name}</span>

                    <span><i class="fas fa-calendar-alt"></i> ${formatDate(task.dueDate)}</span>

                </div>

            </div>

            <div class="task-actions">

                <button class="btn btn-sm btn-outline delete-task" data-task-id="${task.id}">

                    <i class="fas fa-trash"></i>

                </button>

            </div>

        `;

        el.querySelector('input[type="checkbox"]').addEventListener('change', e =>

            toggleTaskCompletion(task.id, e.target.checked)

        );

        el.querySelector('.delete-task').addEventListener('click', () =>

            deleteTask(task.id)

        );

        return el;

    }));



    taskElements.forEach(el => tasksList.appendChild(el));

}



async function toggleTaskCompletion(taskId, completed) {

    try {

        await updateDoc(doc(db, 'groups', groupId, 'tasks', taskId), { completed });

        loadTasks();

    } catch (err) {

        console.error('Update task error:', err);

        showAlert('Task update failed.', 'error');

    }

}



async function deleteTask(taskId) {

    if (!confirm('Delete this task?')) return;



    try {

        await deleteDoc(doc(db, 'groups', groupId, 'tasks', taskId));

        loadTasks();

    } catch (err) {

        console.error('Delete task error:', err);

        showAlert('Could not delete task.', 'error');

    }

}



async function approveMember(uid) {

    await updateDoc(doc(db, 'groups', groupId), {

        pendingMembers: arrayRemove(uid),

        members: arrayUnion(uid)

    });

    loadGroupData(); // refresh

}



async function rejectMember(uid) {

    await updateDoc(doc(db, 'groups', groupId), {

        pendingMembers: arrayRemove(uid)

    });

    loadGroupData(); // refresh

}





// Helpers

function formatTime(date) {

    return date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

}



function formatDate(dateStr) {

    return dateStr ? new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

}



function showAlert(message, type = 'info') {

    const alert = document.createElement('div');

    alert.className = `alert alert-${type}`;

    alert.textContent = message;

    const main = document.querySelector('main') || document.body;

    main.insertBefore(alert, main.firstChild);

    setTimeout(() => alert.remove(), 5000);

}