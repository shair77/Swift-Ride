const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const phone = document.getElementById('phone').value;
  const role = document.getElementById('role').value;

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

  if (password !== confirmPassword) {
    showToast('Passwords do not match', false);
    return;
  }

  const newUser = { name, email, password, phone, role };

  try {
    const submitButton = document.querySelector('button[type="submit"]');

    // Check if email already exists
    const emailCheckResponse = await fetch('http://localhost:5000/api/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const emailCheckData = await emailCheckResponse.json();
    if (emailCheckData.exists) {
      showToast('Email is already in use!', false);
      return;
    }

    submitButton.disabled = true;
    submitButton.innerText = 'Registering...';

    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });

    if (response.ok) {
      showToast('Registration successful', true);
      setTimeout(() => window.location.href = 'login.html', 2000); // little delay before redirect
    } else {
      showToast('Error registering user', false);
    }

  } catch (err) {
    console.error('Error:', err);
    showToast('There was an issue with the registration process. Please try again.', false);
  } finally {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerText = 'Register';
    }
  }
});
