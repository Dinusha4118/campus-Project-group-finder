import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";
import { 
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { auth, db } from './firebase.js';

// DOM elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.querySelector('.btn-logout');

// Login
// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = loginForm['loginEmail'].value;
        const password = loginForm['loginPassword'].value;
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error("Login error:", error);
            showAlert(getAuthErrorMessage(error), 'error');
        }
    });
}

// Register
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = registerForm['registerEmail'].value;
        const password = registerForm['registerPassword'].value;
        const name = registerForm['registerName'].value;
        const department = registerForm['registerDepartment'].value;
        const batch = registerForm['registerBatch'].value;
        const skills = registerForm['registerSkills'].value.split(',').map(skill => skill.trim());
        
        try {
            // Create user with email/password
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Add user data to Firestore
            await setDoc(doc(db, "users", user.uid), {
                name,
                email,
                department,
                batch,
                skills,
                createdAt: serverTimestamp()
            });
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error("Registration error:", error);
            showAlert(getAuthErrorMessage(error), 'error');
        }
    });
}

// Logout
// Modify your logout button event listener to this:
document.addEventListener('click', function(e) {
  if (e.target.closest('.btn-logout')) {
    e.preventDefault();
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    }).catch((error) => {
      console.error("Logout error:", error);
    });
  }
});

// Auth state observer
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed. User:', user);
    console.log('Current path:', window.location.pathname);

    const currentPath = window.location.pathname;

    if (user) {
        console.log('User is signed in');
        if (
            currentPath.endsWith('login.html') || 
            currentPath.endsWith('register.html') ||
            currentPath.endsWith('index.html')
        ) {
            console.log('Redirecting to dashboard...');
            window.location.href = 'dashboard.html';  // ✅ Corrected
        }
    } else {
        console.log('User is signed out');
        if (
            currentPath.includes('dashboard.html') || 
            currentPath.includes('groups.html') ||
            currentPath.includes('profile.html')
        ) {
            console.log('Redirecting to login...');
            window.location.href = 'login.html';
        }
    }
});

// Helper function for error messages
function getAuthErrorMessage(error) {
    switch(error.code) {
        case 'auth/email-already-in-use':
            return "This email is already registered.";
        case 'auth/weak-password':
            return "Password should be at least 6 characters.";
        case 'auth/user-not-found':
            return "No account found with this email.";
        case 'auth/wrong-password':
            return "Incorrect password.";
        case 'auth/invalid-email':
            return "Invalid email format.";
        default:
            return "Authentication failed. Please try again.";
    }
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const forms = document.querySelector('.auth-forms') || document.querySelector('main');
    forms.insertBefore(alertDiv, forms.firstChild);
    
    
}