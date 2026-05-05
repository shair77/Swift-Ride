document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  const driverBookingsTableBody = document.getElementById('driverBookingsTableBody');
  const logoutBtn = document.getElementById('logoutBtn');

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

  async function fetchDriverBookings() {
    try {
      const response = await fetch('http://localhost:5000/api/driver-bookings', {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch driver bookings');
      const bookings = await response.json();
      renderDriverBookings(bookings);
    } catch (error) {
      console.error(error);
      showToast('Failed to load assigned rides.', false);
    }
  }

  function renderDriverBookings(bookings) {
    driverBookingsTableBody.innerHTML = '';

    if (bookings.length === 0) {
      driverBookingsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No assigned rides yet.</td>
        </tr>
      `;
      return;
    }

    bookings.forEach(booking => {
      const row = document.createElement('tr');
      row.innerHTML = `
<td>${booking.Booking_ID ? booking.Booking_ID : 'N/A'}</td>
<td>${booking.Booking_PickupLocation || 'N/A'}</td>
<td>${booking.Booking_DropoffLocation || 'N/A'}</td>
<td><span class="badge ${getStatusBadgeClass(booking.Booking_Status)}">${booking.Booking_Status}</span></td>
<td>${booking.Booking_ID ? renderStatusDropdown(booking) : '<span class="text-muted">N/A</span>'}</td>

      `;
      driverBookingsTableBody.appendChild(row);
    });

    attachStatusChangeHandlers();
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'confirmed': return 'badge-primary';
      case 'pending': return 'badge-warning';
      case 'completed': return 'badge-success';
      case 'canceled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  function renderStatusDropdown(booking) {
    if (booking.Booking_Status === 'completed' || booking.Booking_Status === 'canceled') {
      return `<span class="text-muted">No Actions</span>`;
    }
    return `
      <select class="form-control statusSelect" data-id="${booking.Booking_ID}">
        <option value="confirmed" ${booking.Booking_Status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
        <option value="completed">Completed</option>
        <option value="canceled">canceled</option>
      </select>
    `;
  }

  function attachStatusChangeHandlers() {
    document.querySelectorAll('.statusSelect').forEach(select => {
      select.addEventListener('change', async (e) => {
        const bookingId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
  
        if (!bookingId || bookingId === "undefined") {
          console.error('Invalid booking ID.', bookingId);
          showToast('Invalid booking ID.', false);
          return;
        }
  
        try {
          const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify({ status: newStatus })
          });
  
          if (!response.ok) throw new Error('Failed to update booking status');
  
          showToast('Booking status updated successfully!', true);
          fetchDriverBookings(); // Refresh table after update
        } catch (error) {
          console.error('Error updating booking status:', error);
          showToast('Failed to update booking status.', false);
        }
      });
    });
  }
  

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
  });

  fetchDriverBookings();
});
