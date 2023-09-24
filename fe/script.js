let members = [];
let bottles = [];

window.onload = function() {
  updateMemberList();
};

function addBottle() {
  const bottleName = document.getElementById("bottleName").value;
  const bottlePrice = document.getElementById("bottlePrice").value;
  
  bottles.push({ bottleName, bottlePrice });
  
  // Clear input
  document.getElementById("bottleName").value = '';
  document.getElementById("bottlePrice").value = '';
  
  updateBottleList();
}

function updateBottleList() {
  const list = document.getElementById("bottlesList");
  list.innerHTML = '';
  
  bottles.forEach(bottle => {
    const listItem = document.createElement("li");
    listItem.textContent = `${bottle.bottleName} (Price: ${bottle.bottlePrice})`;
    list.appendChild(listItem);
  });
}

async function addMember() {
  const name = document.getElementById("memberName").value;
  const status = document.getElementById("memberStatus").value;

  const response = await fetch("http://127.0.0.1:8080/add_member", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, status }),
  });

  if (response.ok) {
    // Refresh the members list
    updateMemberList();
  } else {
    console.error("Failed to add member");
  }
}

async function updateMemberList() {
  console.log("Function called");
  const response = await fetch("http://127.0.0.1:8080/list_members");
  const members = await response.json(); // Assuming the backend returns JSON

  const list = document.getElementById("membersList");
  list.innerHTML = '';
  
  members.forEach(member => {
    const listItem = document.createElement("li");
    listItem.textContent = `${member.name} (${member.status})`;
    
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function() {
      deleteMember(member.name);
    };

    listItem.appendChild(deleteButton);
    list.appendChild(listItem);
  });
}

async function deleteMember(name) {
  const response = await fetch("http://127.0.0.1:8080/delete_member", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: name })
  });

  if (response.ok) {
    // Refresh the members list
    updateMemberList();
  } else {
    console.error("Failed to delete member");
  }
}

async function searchWhisky() {
  const query = document.getElementById('whiskySearchInput').value;
  const response = await fetch(`http://127.0.0.1:8080/search_whisky?query=${query}`);
  const results = await response.json();

  const dropdown = document.getElementById('whiskyDropdown');
  dropdown.innerHTML = '';

  results.forEach(whisky => {
    const item = document.createElement('div');
    item.textContent = whisky.name;
    item.className = 'dropdown-item'; // Add a class for styling
    item.onclick = function() {
      selectedWhisky = whisky; // Set the selected whisky
      document.getElementById('whiskySearchInput').value = whisky.name; // Update the input field
    };
    dropdown.appendChild(item);
  });
}


function addBottle() {
  if (selectedWhisky) {
    const list = document.getElementById('bottlesList');
    const listItem = document.createElement('li');
    const price = document.getElementById('bottlePrice').value;
    if (!price) {
      alert('Please enter a price');
      return;
    }
    // Join all fields with commas and add the price
    const whiskyDetails = `${Object.values(selectedWhisky).join(', ')}, Price: ${price}`;
    
    listItem.textContent = whiskyDetails;
    list.appendChild(listItem);
    document.getElementById('whiskyDropdown').innerHTML = '';
    document.getElementById('whiskySearchInput').value = '';
    document.getElementById('bottlePrice').value = '';

    // Display "Added!" message
    const addedMsg = document.getElementById('addedMsg');
    addedMsg.textContent = 'Added!';
    setTimeout(() => addedMsg.textContent = '', 3000); // Remove the message after 3 seconds
    
  }
}

  function toggleAdmin() {
    const adminSection = document.getElementById("adminSection");
    if (adminSection.style.display === "none" || adminSection.style.display === "") {
      adminSection.style.display = "block";
    } else {
      adminSection.style.display = "none";
    }
  }

  