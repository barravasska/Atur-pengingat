document.addEventListener('DOMContentLoaded', () => {
    
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

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const tasksCollection = db.collection('tasks');


    const reminderForm = document.getElementById('reminder-form');
    const taskInput = document.getElementById('task-input');
    const timeInput = document.getElementById('time-input');
    const taskList = document.getElementById('task-list');
    
    let activeTimeouts = {};


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


    tasksCollection.orderBy('completed').orderBy('time').onSnapshot(snapshot => {
        taskList.innerHTML = '';
        Object.values(activeTimeouts).forEach(clearTimeout);
        activeTimeouts = {};

        snapshot.docs.forEach(doc => {
            renderTask(doc);
        });
    });
    

    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const taskText = taskInput.value.trim();
        const reminderTimeValue = timeInput.value;

        if (taskText === '' || reminderTimeValue === '') { return; }
        const reminderTime = new Date(reminderTimeValue);
        if (reminderTime <= new Date()) { return; }

        tasksCollection.add({
            text: taskText,
            time: firebase.firestore.Timestamp.fromDate(reminderTime),
            completed: false 
        }).then(() => {
            console.log('Tugas berhasil ditambahkan!');
            reminderForm.reset();
        }).catch(error => { });
    });


    function toggleTaskStatus(id, currentStatus) {
        tasksCollection.doc(id).update({
            completed: !currentStatus 
        }).then(() => {
            console.log('Status tugas berhasil diubah!');
            if (!currentStatus === true && activeTimeouts[id]) {
                clearTimeout(activeTimeouts[id]);
                delete activeTimeouts[id];
                console.log(`Alarm untuk tugas ${id} dibatalkan.`);
            }
        }).catch(error => {
            console.error("Error updating status: ", error);
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
            console.log('Tugas berhasil dihapus!');
            if (activeTimeouts[id]) {
                clearTimeout(activeTimeouts[id]);
                delete activeTimeouts[id];
            }
        }).catch(error => { });
    }
});