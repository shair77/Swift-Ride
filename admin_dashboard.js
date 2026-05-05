// FINAL admin_dashboard.js (TOAST + UNDO ready)

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  const bookingsTableBody = document.getElementById('bookingsTableBody');
  const totalBookingsEl = document.getElementById('totalBookings');
  const pendingBookingsEl = document.getElementById('pendingBookings');
  const completedBookingsEl = document.getElementById('completedBookings');
  const searchInput = document.getElementById('searchBookings');
  const refreshButton = document.getElementById('refreshBookings');
  const assignDriverForm = document.getElementById('assignDriverForm');
  let allBookings = [];

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

  async function fetchBookings() {
    try {
      const response = await fetch('http://localhost:5000/api/bookings', {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const bookings = await response.json();
      allBookings = bookings;
      renderBookings(allBookings);
      updateStats(allBookings);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showToast('Failed to load bookings.', false);
    }
  }

  function renderBookings(bookings) {
    bookingsTableBody.innerHTML = '';
    bookings.forEach(booking => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${booking.Booking_ID}</td>
        <td>${booking.Booking_CustomerID}</td>
        <td>${booking.Booking_VehicleID || '-'}</td>
        <td>${booking.Booking_PickupLocation}</td>
        <td>${booking.Booking_DropoffLocation}</td>
        <td><span class="badge ${getStatusBadgeClass(booking.Booking_Status)}">${booking.Booking_Status}</span></td>
        <td><button class="btn btn-primary btn-sm assignBtn" data-id="${booking.Booking_ID}">Assign Driver</button></td>
      `;
      bookingsTableBody.appendChild(row);
    });

    document.querySelectorAll('.assignBtn').forEach(button => {
      button.addEventListener('click', (e) => {
        const bookingId = e.target.getAttribute('data-id');
        document.getElementById('bookingId').value = bookingId;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
    });
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'confirmed': return 'badge-secondary';
      case 'canceled':
      case 'canceled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  function updateStats(bookings) {
    totalBookingsEl.textContent = bookings.length;
    pendingBookingsEl.textContent = bookings.filter(b => b.Booking_Status === 'pending').length;
    completedBookingsEl.textContent = bookings.filter(b => b.Booking_Status === 'completed').length;
  }

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allBookings.filter(b =>
      (b.Booking_PickupLocation && b.Booking_PickupLocation.toLowerCase().includes(term)) ||
      (b.Booking_DropoffLocation && b.Booking_DropoffLocation.toLowerCase().includes(term))
    );
    renderBookings(filtered);
  });

  refreshButton.addEventListener('click', () => {
    fetchBookings();
    searchInput.value = '';
  });

  assignDriverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingId = document.getElementById('bookingId').value;
    const driverId = document.getElementById('driverId').value;

    // Save previous state for Undo
    const previousDriverId = allBookings.find(b => b.Booking_ID == bookingId)?.Booking_DriverID || null;

    try {
      const response = await fetch('http://localhost:5000/api/assign-driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ bookingId, driverId })
      });

      if (!response.ok) throw new Error('Failed to assign driver');

      showUndoToast('Driver assigned!', async () => {
        // Undo assignment by resetting driver
        try {
          await fetch('http://localhost:5000/api/assign-driver', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify({ bookingId, driverId: previousDriverId })
          });
          fetchBookings();
          showToast('Undo successful! Driver reverted.', true);
        } catch (error) {
          showToast('Undo failed.', false);
        }
      });

      fetchBookings();
      assignDriverForm.reset();
    } catch (error) {
      console.error('Error assigning driver:', error);
      showToast('Failed to assign driver.', false);
    }
  });

  function showUndoToast(message, undoCallback) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast bg-primary text-white`;
    toast.style.minWidth = '300px';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
      <div class="toast-body">
        ${message}
        <button type="button" class="btn btn-sm btn-light ml-2" id="undoBtn">Undo</button>
        <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast" aria-label="Close" style="border:none;background:none;">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    `;
    toastContainer.appendChild(toast);
    $(toast).toast({ delay: 10000 });
    $(toast).toast('show');

    document.getElementById('undoBtn').addEventListener('click', () => {
      undoCallback();
      $(toast).toast('hide');
    });

    $(toast).on('hidden.bs.toast', () => toast.remove());
  }

  window.logout = function () {
    localStorage.removeItem('authToken');
  };

  fetchBookings();
});
