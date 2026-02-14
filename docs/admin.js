const { createApp, ref, onMounted } = Vue;

const app = createApp({
  template: `
    <div class="app-container">
      <!-- Access Denied -->
      <div v-if="accessDenied" class="login-page">
        <article class="login-card">
          <h1>Access Denied</h1>
          <p>You must be an admin to view this page.</p>
          <a href="index.html" class="btn-back">Back to Main Page</a>
        </article>
      </div>

      <!-- Admin Panel -->
      <div v-else-if="isReady" class="main-page">
        <nav>
          <ul>
            <li><strong>Admin Panel</strong></li>
          </ul>
          <ul>
            <li><a href="index.html" class="btn-logout">Back to Main</a></li>
          </ul>
        </nav>

        <main class="container">
          <!-- Add / Edit Bottle Form -->
          <article class="admin-form-section">
            <h3>{{ editingId ? 'Edit Bottle' : 'Add Bottle' }}</h3>

            <!-- Search from catalog -->
            <div v-if="!editingId" class="search-wrapper">
              <div class="search-row">
                <input
                  v-model="searchQuery"
                  @keydown.enter.prevent="doSearch"
                  type="text"
                  placeholder="Search whisky catalog to pre-fill..."
                  class="search-input"
                >
                <button type="button" @click="doSearch" class="btn-search">Search</button>
              </div>
              <div v-if="searchResults.length > 0" class="search-dropdown">
                <div
                  v-for="(result, idx) in searchResults"
                  :key="idx"
                  class="search-result"
                  @click="selectResult(result)"
                >
                  <strong>{{ result.name }}</strong>
                  <span class="search-result-details">
                    {{ [result.age, result.strength, result.bottle_size].filter(Boolean).join(' · ') }}
                  </span>
                </div>
                <div v-if="searchResults.length >= 10" class="search-hint">
                  Showing top 10 — refine your search for more results
                </div>
              </div>
            </div>

            <form @submit.prevent="saveBottle">
              <div class="grid">
                <label>
                  Name *
                  <input v-model="form.name" type="text" placeholder="e.g. Laphroaig 2005 Single Cask" required>
                </label>
                <label>
                  Age
                  <input v-model="form.age" type="text" placeholder="e.g. 16 years">
                </label>
                <label>
                  Strength
                  <input v-model="form.strength" type="text" placeholder="e.g. 54.5 % Vol.">
                </label>
              </div>
              <div class="grid">
                <label>
                  Bottle Size
                  <input v-model="form.bottle_size" type="text" placeholder="e.g. 700 ml">
                </label>
                <label>
                  Year Bottled
                  <input v-model="form.year_bottled" type="text" placeholder="e.g. 2023">
                </label>
                <label>
                  Price *
                  <input v-model="form.price" type="number" placeholder="e.g. 13215" required>
                </label>
              </div>
              <div class="admin-form-actions">
                <button type="submit">{{ editingId ? 'Update' : 'Add Bottle' }}</button>
                <button v-if="editingId" type="button" class="btn-cancel" @click="cancelEdit">Cancel</button>
              </div>
              <p v-if="formError" class="form-error">{{ formError }}</p>
              <p v-if="formSuccess" class="form-success">{{ formSuccess }}</p>
            </form>
          </article>

          <!-- Bottles Table -->
          <article class="bottles-section">
            <h3>Bottles in Stock ({{ bottles.length }})</h3>
            <div v-if="loading">Loading...</div>
            <div v-else-if="bottles.length === 0">No bottles in stock</div>
            <table v-else>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Strength</th>
                  <th>Size</th>
                  <th>Year</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="bottle in bottles" :key="bottle.id">
                  <td><strong>{{ bottle.name }}</strong></td>
                  <td>{{ bottle.age }}</td>
                  <td>{{ bottle.strength }}</td>
                  <td>{{ bottle.bottle_size }}</td>
                  <td>{{ bottle.year_bottled }}</td>
                  <td>{{ bottle.price }}</td>
                  <td class="actions-cell">
                    <button class="btn-edit" @click="startEdit(bottle)">Edit</button>
                    <button class="btn-delete" @click="deleteBottle(bottle)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        </main>
      </div>
    </div>
  `,

  setup() {
    const apiBase = location.hostname === "localhost" ? "http://localhost:8080" : "https://philosophy-club.onrender.com";
    const isReady = ref(false);
    const accessDenied = ref(false);
    const loading = ref(true);
    const bottles = ref([]);
    const editingId = ref(null);
    const formError = ref("");
    const formSuccess = ref("");
    const form = ref({ name: "", age: "", strength: "", bottle_size: "", year_bottled: "", price: "" });
    const searchQuery = ref("");
    const searchResults = ref([]);

    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");

    const authHeaders = () => ({
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    });

    // Check auth
    if (!token || role !== "admin") {
      accessDenied.value = true;
    } else {
      isReady.value = true;
      fetchBottles();
    }

    async function fetchBottles() {
      loading.value = true;
      try {
        const res = await fetch(`${apiBase}/bottles`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 401) {
          accessDenied.value = true;
          isReady.value = false;
          return;
        }
        if (res.ok) {
          bottles.value = await res.json();
        }
      } catch (e) {
        formError.value = "Failed to load bottles";
      } finally {
        loading.value = false;
      }
    }

    async function saveBottle() {
      formError.value = "";
      formSuccess.value = "";

      const payload = {
        name: form.value.name,
        age: form.value.age,
        strength: form.value.strength,
        bottle_size: form.value.bottle_size,
        year_bottled: form.value.year_bottled,
        price: form.value.price
      };

      try {
        let res;
        if (editingId.value) {
          res = await fetch(`${apiBase}/bottles/${editingId.value}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch(`${apiBase}/bottles`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(payload)
          });
        }

        if (res.status === 401) {
          accessDenied.value = true;
          isReady.value = false;
          return;
        }

        if (res.ok) {
          formSuccess.value = editingId.value ? "Bottle updated!" : "Bottle added!";
          editingId.value = null;
          form.value = { name: "", age: "", strength: "", bottle_size: "", year_bottled: "", price: "" };
          await fetchBottles();
        } else {
          const data = await res.json();
          formError.value = data.error || "Failed to save bottle";
        }
      } catch (e) {
        formError.value = "Network error";
      }
    }

    function startEdit(bottle) {
      editingId.value = bottle.id;
      form.value = {
        name: bottle.name,
        age: bottle.age,
        strength: bottle.strength,
        bottle_size: bottle.bottle_size,
        year_bottled: bottle.year_bottled,
        price: bottle.price
      };
      formError.value = "";
      formSuccess.value = "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function cancelEdit() {
      editingId.value = null;
      form.value = { name: "", age: "", strength: "", bottle_size: "", year_bottled: "", price: "" };
      formError.value = "";
      formSuccess.value = "";
    }

    async function deleteBottle(bottle) {
      if (!confirm(`Delete "${bottle.name}"?`)) return;

      formError.value = "";
      formSuccess.value = "";

      try {
        const res = await fetch(`${apiBase}/bottles/${bottle.id}`, {
          method: "DELETE",
          headers: authHeaders()
        });

        if (res.status === 401) {
          accessDenied.value = true;
          isReady.value = false;
          return;
        }

        if (res.ok) {
          formSuccess.value = "Bottle deleted!";
          await fetchBottles();
        } else {
          const data = await res.json();
          formError.value = data.error || "Failed to delete bottle";
        }
      } catch (e) {
        formError.value = "Network error";
      }
    }

    async function doSearch() {
      const q = searchQuery.value.trim();
      if (q.length < 2) {
        searchResults.value = [];
        return;
      }
      try {
        const res = await fetch(`${apiBase}/whiskies/search?q=${encodeURIComponent(q)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          searchResults.value = await res.json();
        }
      } catch (e) {
        searchResults.value = [];
      }
    }

    function selectResult(result) {
      form.value = {
        name: result.name || "",
        age: result.age || "",
        strength: result.strength || "",
        bottle_size: result.bottle_size || "",
        year_bottled: result.year_bottled || "",
        price: ""
      };
      searchQuery.value = "";
      searchResults.value = [];
    }

    return {
      isReady,
      accessDenied,
      loading,
      bottles,
      editingId,
      form,
      formError,
      formSuccess,
      searchQuery,
      searchResults,
      doSearch,
      selectResult,
      saveBottle,
      startEdit,
      cancelEdit,
      deleteBottle
    };
  }
});

app.mount("#app");
