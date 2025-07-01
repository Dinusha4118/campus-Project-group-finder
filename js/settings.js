import { db, auth } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const fullNameInput = document.getElementById('fullName');
    const userEmailInput = document.getElementById('userEmail');
    const userSkillsInput = document.getElementById('userSkills');

    let currentUser;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                fullNameInput.value = userData.name || '';
                userEmailInput.value = user.email || '';
                userSkillsInput.value = (userData.skills || []).join(', ');
            }
        }
    });

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userRef = doc(db, 'users', currentUser.uid);
            try {
                await updateDoc(userRef, {
                    name: fullNameInput.value,
                    skills: userSkillsInput.value.split(',').map(s => s.trim())
                });
                alert('Profile updated successfully!');
            } catch (error) {
                alert('Error updating profile.');
            }
        });
    }

    if(passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Password change requires re-authentication, which is more complex.
            // This is a simplified example.
            alert('Password change functionality requires secure implementation.');
        });
    }
});