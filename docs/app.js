const { createApp, ref, watch, nextTick, onMounted } = Vue;

const app = createApp({
  template: `
    <div class="app-container">
      <!-- Login Page -->
      <div v-if="!isLoggedIn" class="login-page">
        <article class="login-card">
          <h1>Philosophy Club</h1>
          <p>A gentlemen's circle for fine spirits and refined conversation</p>
          
          <!-- Google will render their button here -->
          <div id="google_button_container" style="display: flex; justify-content: center;"></div>
        </article>
      </div>

      <!-- Main Page (after login) -->
      <div v-else class="main-page">
        <nav>
          <ul>
            <li><strong>Philosophy Club</strong></li>
          </ul>
          
          <div class="countdown-display">
            <div class="countdown-label">Next gathering</div>
            <div class="countdown-time">
              {{ String(countdownHours).padStart(2, '0') }}:{{ String(countdownMinutes).padStart(2, '0') }}:{{ String(countdownSeconds).padStart(2, '0') }}
            </div>
          </div>
          
          <ul>
            <li class="user-info-nav">
              <div><strong>{{ userName || 'Guest' }}</strong></div>
              <div class="email-small">{{ userEmail }}</div>
            </li>
            <li v-if="userRole === 'admin'"><button @click="goToAdminPanel" class="btn-admin">Admin Panel</button></li>
            <li><button @click="logout" class="btn-logout">Logout</button></li>
          </ul>
        </nav>

        <main class="container">

          <article class="bottles-section">
            <h3>Bottles in Stock</h3>
            <div v-if="bottles.length === 0">No bottles in stock</div>
            <div v-else>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Distillery</th>
                    <th>Age</th>
                    <th>ABV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bottle in bottles" :key="bottle.name">
                    <td><strong>{{ bottle.name }}</strong></td>
                    <td>{{ bottle.distillery }}</td>
                    <td>{{ bottle.age }}</td>
                    <td>{{ bottle.abv }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </main>
      </div>
    </div>
  `,

  setup() {
    const isLoggedIn = ref(false);
    const userEmail = ref("");
    const userName = ref("");
    const userRole = ref("");
    const userToken = ref("");
    const bottles = ref([]);
    const countdownHours = ref(0);
    const countdownMinutes = ref(0);
    const countdownSeconds = ref(0);
    const googleClientId = ref("256483321761-a4hsvv36hbeslq1l3vjm0souh7988fir.apps.googleusercontent.com");
    const apiBase = "https://philosophy-club.onrender.com";

    // Calculate countdown to next Thursday 18:00
    const updateCountdown = () => {
      const now = new Date();
      
      // Find next Thursday at 18:00
      let nextThursday = new Date(now);
      const currentDay = now.getDay(); // 0 = Sunday, 4 = Thursday
      
      // Calculate days until Thursday
      const daysUntilThursday = (4 - currentDay + 7) % 7;
      
      if (daysUntilThursday === 0 && now.getHours() >= 18) {
        // If today is Thursday and it's already past 18:00, next Thursday
        nextThursday.setDate(nextThursday.getDate() + 7);
      } else if (daysUntilThursday > 0) {
        nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
      }
      
      nextThursday.setHours(18, 0, 0, 0);
      
      // Calculate difference
      const diff = nextThursday - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      countdownHours.value = Math.max(0, hours);
      countdownMinutes.value = Math.max(0, minutes);
      countdownSeconds.value = Math.max(0, seconds);
    };

    // Start countdown timer
    const startCountdownTimer = () => {
      updateCountdown();
      setInterval(updateCountdown, 1000);
    };

    // Fetch bottles from backend
    const fetchBottles = async () => {
      try {
        const res = await fetch(`${apiBase}/bottles`, {
          headers: { "Authorization": `Bearer ${userToken.value}` }
        });
        if (res.ok) {
          const bottlesData = await res.json();
          bottles.value = bottlesData;
          console.log(`✓ Loaded ${bottlesData.length} bottles from backend`);
        } else {
          console.error("Failed to fetch bottles:", res.status);
          // Keep empty array if fetch fails
        }
      } catch (error) {
        console.error("Fetch bottles error:", error);
        // Keep empty array if fetch fails
      }
    };

    // Go to Admin Panel
    const goToAdminPanel = () => {
      console.log("[*] Admin Panel clicked - page not implemented yet");
      alert("Admin Panel coming soon!");
    };

    // Sign in with Google is now handled by Google's rendered button
    const signInWithGoogle = () => {
      console.log("[*] Google button click handled by Google's SDK");
    };

    // Initialize Google on page load
    const initGoogle = () => {
      const attemptInit = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.initialize({
            client_id: googleClientId.value,
            callback: window.handleCredentialResponse
          });
          console.log("[✓] Google Sign-In initialized");

          // Render button into the container
          nextTick(() => {
            const container = document.querySelector("#google_button_container");
            if (container) {
              window.google.accounts.id.renderButton(container, {
                type: "standard",
                size: "large",
                theme: "filled_black",
                text: "signin_with",
                logo_alignment: "left"
              });
              console.log("[✓] Google button rendered");
            }
          });
        } else {
          // Retry if Google isn't loaded yet
          setTimeout(attemptInit, 100);
        }
      };
      attemptInit();
    };

    // Initialize on mount
    initGoogle();
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      const email = localStorage.getItem("userEmail");
      const name = localStorage.getItem("userName");
      const role = localStorage.getItem("userRole");

      if (token && email) {
        userToken.value = token;
        userEmail.value = email;
        userName.value = name;
        userRole.value = role;
        isLoggedIn.value = true;
        
        // Start countdown timer and fetch bottles
        startCountdownTimer();
        fetchBottles();
      }
    };

    // Handle Google Sign-In response
    window.handleCredentialResponse = async (response) => {
      const token = response.credential;

      try {
        const res = await fetch(`${apiBase}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: token }),
        });

        if (res.ok) {
          const data = await res.json();
          
          // Store in localStorage
          localStorage.setItem("authToken", token);
          localStorage.setItem("userEmail", data.email);
          localStorage.setItem("userName", data.name);
          localStorage.setItem("userRole", data.role);

          // Update state
          userToken.value = token;
          userEmail.value = data.email;
          userName.value = data.name;
          userRole.value = data.role;
          isLoggedIn.value = true;
          
          // Start countdown timer and fetch bottles
          startCountdownTimer();
          fetchBottles();

          console.log(`✓ Logged in as ${data.name} (${data.email})`);
        } else {
          alert("Login failed");
        }
      } catch (error) {
        console.error("Login error:", error);
        alert("Login error");
      }
    };

    // Logout function
    const logout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");

      userToken.value = "";
      userEmail.value = "";
      userName.value = "";
      userRole.value = "";
      isLoggedIn.value = false;

      console.log("✓ Logged out");
    };

    // Re-render Google button when login page appears
    watch(isLoggedIn, async (newVal) => {
      if (!newVal && window.google && window.google.accounts && window.google.accounts.id) {
        // Refresh Google Sign-In when logging out
        await nextTick();
        console.log("[✓] Login state changed, Google ready for next sign-in");
      }
    });

    // Initialize
    checkAuth();

    return {
      isLoggedIn,
      userEmail,
      userName,
      userRole,
      bottles,
      countdownHours,
      countdownMinutes,
      countdownSeconds,
      goToAdminPanel,
      logout,
    };
  },
});

app.mount("#app");
