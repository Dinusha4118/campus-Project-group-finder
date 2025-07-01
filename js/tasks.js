import { db, auth } from './firebase.js';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const todoTasksContainer = document.getElementById('todo-tasks');
    const inprogressTasksContainer = document.getElementById('inprogress-tasks');
    const completedTasksContainer = document.getElementById('completed-tasks');

    let currentUser;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadAllUserTasks();
        } else {
            window.location.href = 'login.html';
        }
    });

    async function loadAllUserTasks() {
        if (!currentUser) return;

        // Clear existing tasks
        todoTasksContainer.innerHTML = '';
        inprogressTasksContainer.innerHTML = '';
        completedTasksContainer.innerHTML = '';

        try {
            // Find all groups the user is a member of
            const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
            const groupsSnapshot = await getDocs(groupsQuery);

            if (groupsSnapshot.empty) {
                todoTasksContainer.innerHTML = '<p>No tasks found.</p>';
                return;
            }

            // Fetch tasks from each group
            for (const groupDoc of groupsSnapshot.docs) {
                const groupId = groupDoc.id;
                const groupData = groupDoc.data();
                const tasksQuery = query(collection(db, 'groups', groupId, 'tasks'));
                const tasksSnapshot = await getDocs(tasksQuery);

                tasksSnapshot.forEach(taskDoc => {
                    const taskData = { id: taskDoc.id, ...taskDoc.data() };
                    const taskCard = createTaskCard(taskData, groupData);

                    if (taskData.status === 'completed') {
                        completedTasksContainer.appendChild(taskCard);
                    } else if (taskData.status === 'inprogress') {
                        inprogressTasksContainer.appendChild(taskCard);
                    } else { // 'todo' or undefined
                        todoTasksContainer.appendChild(taskCard);
                    }
                });
            }
        } catch (error) {
            console.error("Error loading tasks:", error);
            todoTasksContainer.innerHTML = '<p>Error loading tasks. Please try again later.</p>';
        }
    }

    function createTaskCard(task, group) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('draggable', 'true');
        card.dataset.taskId = task.id;
        card.dataset.groupId = group.id;

        card.innerHTML = `
            <h5>${task.title}</h5>
            <p>${task.description || ''}</p>
            <div class="task-meta">
                <span><i class="fas fa-users"></i> ${group.name}</span>
                <span><i class="fas fa-calendar-alt"></i> ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}</span>
            </div>
        `;

        // Add drag and drop event listeners
        card.addEventListener('dragstart', handleDragStart);
        return card;
    }

    // Drag and Drop Handlers
    function handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.dataTransfer.setData('group/id', e.target.dataset.groupId);
    }

    const taskColumns = document.querySelectorAll('.tasks-list');

    taskColumns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            const taskId = e.dataTransfer.getData('text/plain');
            const groupId = e.dataTransfer.getData('group/id');
            const newStatus = column.parentElement.querySelector('h4').textContent.toLowerCase().replace(' ', ''); // 'todo', 'inprogress', 'completed'

            const taskRef = doc(db, 'groups', groupId, 'tasks', taskId);

            try {
                await updateDoc(taskRef, {
                    status: newStatus
                });
                // Reload tasks to reflect the change
                loadAllUserTasks();
            } catch (error) {
                console.error("Error updating task status:", error);
            }
        });
    });

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
});