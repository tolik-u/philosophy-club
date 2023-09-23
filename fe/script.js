let members = [];
let bottles = [];

// Existing addMember() and updateMemberList() functions

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

function addMember() {
    const username = document.getElementById("username").value;
    const status = document.getElementById("status").value;
    
    members.push({ username, status });
    
    // Clear input
    document.getElementById("username").value = '';
    
    updateMemberList();
  }
  
  function updateMemberList() {
    const list = document.getElementById("membersList");
    list.innerHTML = '';
    
    members.forEach(member => {
      const listItem = document.createElement("li");
      listItem.textContent = `${member.username} (${member.status})`;
      list.appendChild(listItem);
    });
  }

function toggleAdmin() {
    const adminSection = document.getElementById("adminSection");
    if (adminSection.style.display === "none" || adminSection.style.display === "") {
      adminSection.style.display = "block";
    } else {
      adminSection.style.display = "none";
    }
  }

// Fetch whiskeys when the page loads
window.onload = function() {
    fetchWhiskeys();
  };
  
  function fetchWhiskeys() {
    fetch('https://www.thecocktaildb.com/api/json/v1/1/filter.php?i=Whiskey')
      .then(response => response.json())
      .then(data => {
        const datalist = document.getElementById('whiskeys');
        data.drinks.forEach(drink => {
          const option = document.createElement('option');
          option.value = drink.strDrink;
          datalist.appendChild(option);
        });
      })
      .catch(error => console.error('Error fetching whiskeys:', error));
  }
  