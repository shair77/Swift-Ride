document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  const bookingsTableBody = document.getElementById('bookingsTableBody');
  const totalBookingsEl = document.getElementById('totalBookings');
  const pendingBookingsEl = document.getElementById('pendingBookings');
  const completedBookingsEl = document.getElementById('completedBookings');
  const searchInput = document.getElementById('searchInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const bookRideForm = document.getElementById('bookRideForm');
  const pickupInput = document.getElementById('pickupLocation');
  const dropoffInput = document.getElementById('dropoffLocation');
  const fareInput = document.getElementById('fare');

  let myBookings = [];

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  function showToast(message, isSuccess = true) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
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

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  }

  async function fetchBookings() {
    try {
      const response = await fetch('http://localhost:5000/api/my-bookings', {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');

      const bookings = await response.json();
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      myBookings = bookings.filter(b => b.Booking_CustomerID === userId);

      renderBookings(myBookings);
      updateStats(myBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      showToast('Failed to load your bookings.', false);
    }
  }

  function renderBookings(bookings) {
    bookingsTableBody.innerHTML = '';
    bookings.forEach(booking => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${booking.Booking_ID}</td>
        <td>${booking.Booking_PickupLocation}</td>
        <td>${booking.Booking_DropoffLocation}</td>
        <td><span class="badge ${getStatusBadgeClass(booking.Booking_Status)}">${booking.Booking_Status}</span></td>
        <td>
          ${booking.Booking_Status === 'pending' 
            ? `<button class="btn btn-danger btn-sm cancelBtn" data-id="${booking.Booking_ID}">Cancel</button>`
            : `<span class="text-muted">No Actions</span>`
          }
        </td>
      `;
      bookingsTableBody.appendChild(row);
    });

    document.querySelectorAll('.cancelBtn').forEach(button => {
      button.addEventListener('click', handleCancelBooking);
    });
  }

  function updateStats(bookings) {
    totalBookingsEl.textContent = bookings.length;
    pendingBookingsEl.textContent = bookings.filter(b => b.Booking_Status === 'pending').length;
    completedBookingsEl.textContent = bookings.filter(b => b.Booking_Status === 'completed').length;
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'confirmed': return 'badge-primary';
      case 'canceled':
      case 'canceled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  async function handleCancelBooking(e) {
    const bookingId = e.target.getAttribute('data-id');
    const row = e.target.closest('tr');
    
    row.style.display = 'none';

    showUndoToast('Booking canceled! Undo?', async () => {
      row.style.display = '';
    }, async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });
        if (!response.ok) throw new Error('Failed to cancel booking');
        showToast('Booking permanently canceled.', true);
        fetchBookings();
      } catch (error) {
        console.error('Error cancelling booking:', error);
        showToast('Failed to cancel booking.', false);
      }
    });
  }

  function showUndoToast(message, undoCallback, finalizeCallback) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast bg-primary text-white';
    toast.style.minWidth = '300px';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="toast-body">
        ${message}
        <button type="button" class="btn btn-sm btn-light ml-2" id="undoCancelBtn">Undo</button>
        <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast" aria-label="Close" style="border:none;background:none;">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    `;
    toastContainer.appendChild(toast);

    $(toast).toast({ delay: 10000 });
    $(toast).toast('show');

    const timeoutId = setTimeout(() => {
      finalizeCallback();
      $(toast).toast('hide');
    }, 10000);

    document.getElementById('undoCancelBtn').addEventListener('click', () => {
      clearTimeout(timeoutId);
      undoCallback();
      $(toast).toast('hide');
    });

    $(toast).on('hidden.bs.toast', () => toast.remove());
  }

  bookRideForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pickup = pickupInput.value;
    const dropoff = dropoffInput.value;
    const fare = fareInput.value;

    try {
      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ pickupLocation: pickup, dropoffLocation: dropoff, fare })
      });

      if (!response.ok) throw new Error('Booking failed');

      showToast('Ride booked successfully!', true);
      $('#bookRideModal').modal('hide');
      fetchBookings();
      bookRideForm.reset();
    } catch (error) {
      console.error('Error booking ride:', error);
      showToast('Failed to book ride.', false);
    }
  });

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    const filtered = myBookings.filter(b =>
      b.Booking_PickupLocation.toLowerCase().includes(term) ||
      b.Booking_DropoffLocation.toLowerCase().includes(term)
    );
    renderBookings(filtered);
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
  });

  fetchBookings();
});
