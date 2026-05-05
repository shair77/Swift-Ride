const bookingForm = document.getElementById('bookingForm');
const bookingsList = document.getElementById('bookingsList');

// Toast Function
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

// Create Toast Container dynamically if not present
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

// Fetch and Display all bookings
async function fetchBookings() {
  try {
    const response = await fetch('http://localhost:5000/api/bookings');
    if (!response.ok) throw new Error('Failed to fetch bookings');

    const bookings = await response.json();
    bookingsList.innerHTML = '';

    bookings.forEach((booking) => {
      const li = document.createElement('li');
      li.textContent = `
        Customer ID: ${booking.Booking_CustomerID || 'N/A'}, 
        Vehicle ID: ${booking.Booking_VehicleID || 'N/A'}, 
        Date: ${booking.Booking_Date || 'N/A'}, 
        Pickup: ${booking.Booking_PickupLocation || 'N/A'}, 
        Dropoff: ${booking.Booking_DropoffLocation || 'N/A'}, 
        Status: ${booking.Booking_Status || 'N/A'}
      `;
      bookingsList.appendChild(li);
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    showToast('Failed to load bookings.', false);
  }
}

// Handle Booking Form Submit
bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const customer_id = document.getElementById('customer_id').value;
  const vehicle_id = document.getElementById('vehicle_id').value;
  const booking_date = document.getElementById('booking_date').value;
  const pickup_location = document.getElementById('pickup_location').value;
  const dropoff_location = document.getElementById('dropoff_location').value;

  if (!customer_id || !vehicle_id || !booking_date || !pickup_location || !dropoff_location) {
    showToast('Please fill in all fields.', false);
    return;
  }

  const newBooking = { customer_id, vehicle_id, booking_date, pickup_location, dropoff_location };
  try {
    const response = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking),
    });

    if (!response.ok) throw new Error('Failed to add booking');

    const savedBooking = await response.json();

    showUndoToast('Booking added successfully!', async () => {
      // Undo: Delete the newly created booking
      try {
        const deleteResponse = await fetch(`http://localhost:5000/api/bookings/${savedBooking.insertId}`, {
          method: 'DELETE'
        });
        if (!deleteResponse.ok) throw new Error('Failed to undo booking');
        showToast('Undo successful! Booking removed.', true);
        fetchBookings();
      } catch (error) {
        showToast('Undo failed.', false);
      }
    });

    fetchBookings();
    bookingForm.reset();
  } catch (error) {
    console.error('Error adding booking:', error);
    showToast('Error adding booking.', false);
  }
});

// Undo Toast Function
function showUndoToast(message, undoCallback) {
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

// Initial Fetch
fetchBookings();
