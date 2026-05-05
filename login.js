document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
  
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
  
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
  
      if (!email || !password) {
        showToast('Please fill in both fields.', false);
        return;
      }
  
      try {
        const response = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
  
        if (!response.ok) {
          const data = await response.json();
          showToast(data.message || 'Invalid login credentials.', false);
          return;
        }
  
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
  
        showToast('Login successful!', true);
  
        setTimeout(() => {
          if (data.role === 'admin') {
            window.location.href = 'admin_dashboard.html';
          } else if (data.role === 'driver') {
            window.location.href = 'driver_dashboard.html';
          } else {
            window.location.href = 'customer_dashboard.html';
          }
        }, 1000);
  
      } catch (error) {
        console.error('Error during login:', error);
        showToast('Something went wrong during login.', false);
      }
    });
  });
  