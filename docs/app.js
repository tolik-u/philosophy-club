const { createApp, ref } = Vue;

const app = createApp({
  template: `
    <div class="app-container">
      <!-- Login Page -->
      <div v-if="!isLoggedIn" class="login-page">
        <article class="login-card">
          <h1>Philosophy Club</h1>
          <p>A gentlemen's circle for fine spirits and refined conversation</p>
          
          <button class="btn-google-signin" @click="signInWithGoogle">
            <svg viewBox="0 0 24 24" width="20" height="20" style="margin-right: 10px;">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
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
            <li v-if="userRole === 'admin' || userRole === 'superadmin'"><button @click="goToAdminPanel" class="btn-admin">Admin Panel</button></li>
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
                    <th>Age</th>
                    <th>Strength</th>
                    <th>Size</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bottle in bottles" :key="bottle.id">
                    <td><strong>{{ bottle.name }}</strong></td>
                    <td>{{ bottle.age }}</td>
                    <td>{{ bottle.strength }}</td>
                    <td>{{ bottle.bottle_size }}</td>
                    <td>{{ bottle.year_bottled }}</td>
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
    const apiBase = location.hostname === "localhost" ? "http://localhost:8080" : "https://philosophy-club.onrender.com";

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
        } else {
          // Keep empty array if fetch fails
        }
      } catch (error) {
        // Keep empty array if fetch fails
      }
    };

    // Go to Admin Panel
    const goToAdminPanel = () => {
      window.location.href = "admin.html";
    };

    // Initialize Google OAuth code client (popup flow)
    let codeClient = null;
    const initGoogle = () => {
      const attemptInit = () => {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          codeClient = window.google.accounts.oauth2.initCodeClient({
            client_id: googleClientId.value,
            scope: "openid email profile",
            ux_mode: "popup",
            callback: async (response) => {
              if (response.error) {
                console.error("Google auth error:", response.error);
                return;
              }
              await handleAuthCode(response.code);
            },
          });
        } else {
          setTimeout(attemptInit, 100);
        }
      };
      attemptInit();
    };

    const signInWithGoogle = () => {
      if (codeClient) {
        codeClient.requestCode();
      }
    };

    const handleAuthCode = async (code) => {
      try {
        const res = await fetch(`${apiBase}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (res.ok) {
          const data = await res.json();

          localStorage.setItem("authToken", data.id_token);
          localStorage.setItem("userEmail", data.email);
          localStorage.setItem("userName", data.name);
          localStorage.setItem("userRole", data.role);

          userToken.value = data.id_token;
          userEmail.value = data.email;
          userName.value = data.name;
          userRole.value = data.role;
          isLoggedIn.value = true;

          startCountdownTimer();
          fetchBottles();
        } else {
          alert("Login failed");
        }
      } catch (error) {
        alert("Login error");
      }
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
    };

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
      signInWithGoogle,
      logout,
    };
  },
});

app.mount("#app");
