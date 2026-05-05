document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const vehiclesTableBody = document.getElementById('vehiclesTableBody');
    const addVehicleForm = document.getElementById('addVehicleForm');
  
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
  
    async function fetchVehicles() {
      try {
        const response = await fetch('http://localhost:5000/api/vehicles', {
          headers: { 'x-auth-token': token }
        });
        if (!response.ok) throw new Error('Failed to fetch vehicles');
        const vehicles = await response.json();
        renderVehicles(vehicles);
      } catch (error) {
        console.error(error);
        showToast('Failed to load vehicles.', false);
      }
    }
  
    function renderVehicles(vehicles) {
      vehiclesTableBody.innerHTML = '';
  
      vehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${vehicle.Vehicle_ID}</td>
          <td>${vehicle.Vehicle_Model}</td>
          <td>${vehicle.Vehicle_RegNo}</td>
          <td>${vehicle.Vehicle_Type}</td>
          <td>${vehicle.Vehicle_Capacity}</td>
          <td>
            <button class="btn btn-danger btn-sm deleteBtn" data-id="${vehicle.Vehicle_ID}">Delete</button>
          </td>
        `;
        vehiclesTableBody.appendChild(row);
      });
  
      document.querySelectorAll('.deleteBtn').forEach(button => {
        button.addEventListener('click', handleDeleteVehicle);
      });
    }
  
    async function handleDeleteVehicle(e) {
      const vehicleId = e.target.getAttribute('data-id');
      const row = e.target.closest('tr');
      
      // Hide row first
      row.style.display = 'none';
  
      const undoToast = document.createElement('div');
      undoToast.className = 'toast bg-warning text-dark';
      undoToast.style.minWidth = '300px';
      undoToast.setAttribute('role', 'alert');
      undoToast.setAttribute('aria-live', 'assertive');
      undoToast.setAttribute('aria-atomic', 'true');
      undoToast.innerHTML = `
        <div class="toast-body text-center">
          Vehicle marked for deletion.
          <button type="button" class="btn btn-sm btn-dark ml-2" id="undoDeleteBtn">Undo</button>
        </div>
      `;
      document.getElementById('toastContainer').appendChild(undoToast);
  
      $(undoToast).toast({ delay: 8000 });
      $(undoToast).toast('show');
  
      let timeoutId = setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/vehicles/${vehicleId}`, {
            method: 'DELETE',
            headers: { 'x-auth-token': token }
          });
          if (!response.ok) throw new Error('Failed to delete vehicle');
          showToast('Vehicle deleted successfully!', true);
          fetchVehicles();
        } catch (error) {
          console.error(error);
          showToast('Failed to delete vehicle.', false);
        }
        undoToast.remove();
      }, 8000);
  
      document.getElementById('undoDeleteBtn').addEventListener('click', () => {
        clearTimeout(timeoutId);
        row.style.display = '';
        undoToast.remove();
      });
    }
  
    addVehicleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const model = document.getElementById('vehicleModel').value;
      const plate = document.getElementById('vehiclePlate').value;
      const type = document.getElementById('vehicleType').value;
      const capacity = document.getElementById('vehicleCapacity').value;
  
      try {
        const response = await fetch('http://localhost:5000/api/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({ model, plate, type, capacity })
        });
  
        if (!response.ok) throw new Error('Failed to add vehicle');
        showToast('Vehicle added successfully!', true);
        addVehicleForm.reset();
        fetchVehicles();
      } catch (error) {
        console.error(error);
        showToast('Failed to add vehicle.', false);
      }
    });
  
    fetchVehicles();
  });
  