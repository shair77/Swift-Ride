document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const usersTableBody = document.getElementById('usersTableBody');
    const searchInput = document.getElementById('searchUserInput');
    let allUsers = [];
  
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
  
    function showToast(message, isSuccess = true) {
      const toastContainer = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${isSuccess ? 'bg-success' : 'bg-danger'} text-white`;
      toast.style.minWidth = '250px';
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      toast.setAttribute('aria-atomic', 'true');
      toast.innerHTML = `
        <div class="toast-body">
          ${message}
          <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast" aria-label="Close" style="border:none;background:none;">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      `;
      toastContainer.appendChild(toast);
      $(toast).toast({ delay: 3000 });
      $(toast).toast('show');
      $(toast).on('hidden.bs.toast', () => toast.remove());
    }
  
    async function fetchUsers() {
      try {
        const response = await fetch('http://localhost:5000/api/users', {
          headers: { 'x-auth-token': token }
        });
  
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        allUsers = users;
        renderUsers(allUsers);
      } catch (error) {
        console.error(error);
        showToast('Failed to load users.', false);
      }
    }
  
    function renderUsers(users) {
      usersTableBody.innerHTML = '';
  
      if (users.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center">No users found.</td></tr>`;
        return;
      }
  
      users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.User_ID}</td>
          <td>${user.User_Name}</td>
          <td>${user.User_Email}</td>
          <td>${user.User_Role}</td>
        `;
        usersTableBody.appendChild(row);
      });
    }
  
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.toLowerCase();
      const filtered = allUsers.filter(user =>
        user.User_ID.toString().includes(term) ||
        (user.User_Name && user.User_Name.toLowerCase().includes(term)) ||
        (user.User_Email && user.User_Email.toLowerCase().includes(term))
      );
      renderUsers(filtered);
    });
  
    fetchUsers();
  });
  