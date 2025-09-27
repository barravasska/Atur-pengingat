document.addEventListener('DOMContentLoaded', () => {
    
    // =================================================================
    // 1. KONFIGURASI FIREBASE
    // =================================================================
    // GANTI DENGAN KONFIGURASI FIREBASE ANDA
    // ATAU GUNAKAN ENVIRONMENT VARIABLES JIKA DI-DEPLOY
    const firebaseConfig = {
        apiKey: "AIzaSyDx2rPVw4zTS_RsaepdNlDQnL-iJblEg2M",
        authDomain: "pengingat-125d2.firebaseapp.com",
        databaseURL: "https://pengingat-125d2-default-rtdb.firebaseio.com",
        projectId: "pengingat-125d2",
        storageBucket: "pengingat-125d2.firebasestorage.app",
        messagingSenderId: "193072002537",
        appId: "1:193072002537:web:1233e9309ff778b5f84778",
        measurementId: "G-8NBMN0K3D6"
    };

    // Inisialisasi Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let tasksCollection; // Akan ditentukan setelah user login
    let unsubscribe; // Untuk menghentikan listener saat logout

    // =================================================================
    // 2. MEMILIH ELEMEN HTML
    // =================================================================
    // Tampilan Auth
    const authContainer = document.getElementById('auth-container');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    // Form Login
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    
    // Form Register
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerButton = document.getElementById('register-button');
    
    // Tampilan Aplikasi Utama
    const appContainer = document.getElementById('app-container');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    
    // Form Tugas
    const reminderForm = document.getElementById('reminder-form');
    const taskInput = document.getElementById('task-input');
    const timeInput = document.getElementById('time-input');
    const taskList = document.getElementById('task-list');

    let activeTimeouts = {};

    // =================================================================
    // 3. LOGIKA AUTENTIKASI (LOGIN, REGISTER, LOGOUT)
    // =================================================================
    
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.style.display = 'none';
        loginView.style.display = 'block';
    });

    registerButton.addEventListener('click', () => {
        const email = registerEmail.value;
        const password = registerPassword.value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                Swal.fire('Sukses!', 'Akun berhasil dibuat. Silakan login.', 'success');
                registerView.style.display = 'none';
                loginView.style.display = 'block';
            })
            .catch(error => Swal.fire('Oops...', error.message, 'error'));
    });

    loginButton.addEventListener('click', () => {
        const email = loginEmail.value;
        const password = loginPassword.value;
        auth.signInWithEmailAndPassword(email, password)
            .catch(error => Swal.fire('Oops...', 'Email atau password salah.', 'error'));
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut();
    });

    // =================================================================
    // 4. PEMANTAU STATUS LOGIN PENGGUNA
    // =================================================================
    auth.onAuthStateChanged(user => {
        if (user) {
            // Pengguna sedang login
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';
            userEmailSpan.textContent = user.email;

            // Arahkan ke koleksi tugas yang spesifik untuk user ini
            tasksCollection = db.collection('users').doc(user.uid).collection('tasks');
            loadTasks();
        } else {
            // Pengguna logout
            authContainer.style.display = 'block';
            appContainer.style.display = 'none';
            taskList.innerHTML = '';
            Object.values(activeTimeouts).forEach(clearTimeout);
            activeTimeouts = {};
            // Hentikan listener Firestore saat logout
            if (unsubscribe) unsubscribe();
        }
    });

    // =================================================================
    // 5. FUNGSI-FUNGSI UTAMA APLIKASI (CRUD TUGAS)
    // =================================================================

    function loadTasks() {
        // Hentikan listener lama sebelum memulai yang baru
        if (unsubscribe) unsubscribe();

        unsubscribe = tasksCollection.orderBy('completed').orderBy('time').onSnapshot(snapshot => {
            taskList.innerHTML = '';
            Object.values(activeTimeouts).forEach(clearTimeout);
            activeTimeouts = {};

            snapshot.docs.forEach(doc => {
                renderTask(doc);
            });
        });
    }

    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskText = taskInput.value.trim();
        const reminderTimeValue = timeInput.value;

        if (taskText === '' || reminderTimeValue === '') {
            Swal.fire('Oops...', 'Mohon isi nama tugas dan waktunya.', 'warning');
            return;
        }
        const reminderTime = new Date(reminderTimeValue);
        if (reminderTime <= new Date()) {
            Swal.fire('Oops...', 'Waktu pengingat harus di masa depan.', 'warning');
            return;
        }

        tasksCollection.add({
            text: taskText,
            time: firebase.firestore.Timestamp.fromDate(reminderTime),
            completed: false
        }).then(() => {
            reminderForm.reset();
        });
    });
    
    function renderTask(doc) {
        const task = doc.data();
        const li = document.createElement('li');
        li.setAttribute('data-id', doc.id);

        if (task.completed) {
            li.classList.add('completed');
        }

        const reminderTime = task.time.toDate();
        const now = new Date();

        const formattedTime = reminderTime.toLocaleString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        li.innerHTML = `
            <div class="task-info">
                <span>${task.text}</span>
                <span class="task-time">Waktu: ${formattedTime}</span>
            </div>
            <div class="task-actions">
                <span class="complete-btn">${task.completed ? '✔️' : '⚪'}</span>
                <button class="delete-btn">Hapus</button>
            </div>
        `;

        taskList.appendChild(li);

        const completeButton = li.querySelector('.complete-btn');
        completeButton.addEventListener('click', () => {
            toggleTaskStatus(doc.id, task.completed);
        });

        const deleteButton = li.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => {
            confirmDeleteTask(doc.id, task.text);
        });
        
        if (reminderTime > now && !task.completed) {
            const delay = reminderTime.getTime() - now.getTime();
            
            if (activeTimeouts[doc.id]) clearTimeout(activeTimeouts[doc.id]);

            const timeoutId = setTimeout(() => {
                Swal.fire({
                    title: '✨ Waktunya! ✨',
                    text: `Jangan lupa kerjakan: "${task.text}"`,
                    icon: 'success',
                    confirmButtonText: 'Oke, Aku Siap!',
                    confirmButtonColor: '#f06292',
                }).then(() => {
                    deleteTask(doc.id);
                });
            }, delay);
            
            activeTimeouts[doc.id] = timeoutId;
        }
    }

    function toggleTaskStatus(id, currentStatus) {
        tasksCollection.doc(id).update({
            completed: !currentStatus
        }).then(() => {
            if (!currentStatus === true && activeTimeouts[id]) {
                clearTimeout(activeTimeouts[id]);
                delete activeTimeouts[id];
            }
        });
    }

    function confirmDeleteTask(id, text) {
        Swal.fire({
            title: 'Yakin mau hapus?',
            text: `Tugas "${text}" akan hilang selamanya lho!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f06292',
            cancelButtonColor: '#bdbdbd',
            confirmButtonText: 'Ya, hapus saja!',
            cancelButtonText: 'Eh, jangan deh'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteTask(id);
            }
        });
    }
    
    function deleteTask(id) {
        tasksCollection.doc(id).delete().then(() => {
            if (activeTimeouts[id]) {
                clearTimeout(activeTimeouts[id]);
                delete activeTimeouts[id];
            }
        });
    }
});


