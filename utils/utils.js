function welcomeMessage() {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);

    // ✅ Check if user is logged in
    account.get()
    .then(user => {
        // console.log("User is logged in:", user);
    })
    .catch(err => {
        console.warn("Not logged in, redirecting...");

        window.location.href= "/testing_projects/auth/sign-in/sign-in"; // 👈 change to your login page path
    });

    async function showUser() {
        try {
            const user = await account.get();
            const username = user.name || user.email;

            if (document.getElementById("welcomeMessage")) {
                // Insert into the HTML
                document.getElementById("welcomeMessage").textContent = "Welcome back, " + username;
            }
            
        } catch {
            // If not logged in, send back to sign in
            window.location.href= "/testing_projects/auth/sign-in/sign-in";
        }
    }
    showUser();
}


async function userAccess() {    

    const currentPage = window.location.pathname.split("/").pop();

    if ( currentPage === "index") {     
        return;
    } 

    try {
        const client = new Appwrite.Client()
            .setEndpoint("https://cloud.appwrite.io/v1") 
            .setProject("68a9b3e90029e6a10ff5");

        const account = new Appwrite.Account(client);
        const databases = new Appwrite.Databases(client);

        const databaseId = "695f766c003a8dc2b3be";
        const adminId = "68d95af4003245ef87a7";
        
        const user = await account.get();
        const email = user.email;         

        const admin = await databases.listDocuments(databaseId, adminId, [Appwrite.Query.equal("email", email)])
        
        if ( admin.documents.length === 0) {
            window.location.replace("/testing_projects/index");    
        } else {        
            console.log("access granted");    
        }

    } catch (error) {
        console.log("error for page access",error);
    }
    
}

async function loadFuelPrices() {
    const pmEl  = document.getElementById("pmsPrice");
    const agoEl = document.getElementById("agoPrice");
    if (!pmEl || !agoEl) return;

    try {
        const client = new Appwrite.Client()
            .setEndpoint("https://cloud.appwrite.io/v1")
            .setProject("68a9b3e90029e6a10ff5");
        const databases = new Appwrite.Databases(client);

        const doc = await databases.getDocument(
            "695f766c003a8dc2b3be",
            "69d3ed400021197ed76e",
            "69d7db7ed8d5d2b73d66"
        );

        pmEl.textContent  = doc.pmsPrice  != null ? Number(doc.pmsPrice).toLocaleString()  + " RWF" : "—";
        agoEl.textContent = doc.agoPrice  != null ? Number(doc.agoPrice).toLocaleString()  + " RWF" : "—";
    } catch {
        pmEl.textContent  = "—";
        agoEl.textContent = "—";
    }
}


window.logout = async function logout() {

  try {
    const client = new Appwrite.Client()
      .setEndpoint("https://cloud.appwrite.io/v1") 
      .setProject("68a9b3e90029e6a10ff5")
    ;

    const account = new Appwrite.Account(client);
    
    await account.deleteSession("current");
    localStorage.removeItem("pompisteLoginTime");
    alert("Logged out successfully");
    window.location.href= "/testing_projects/auth/sign-in/sign-in";
    
  } catch (error) {
    console.log("Error",error);
  }
}


function checkPompisteSession() {
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage !== "index") return;

    const loginTime = parseInt(localStorage.getItem("pompisteLoginTime"));
    if (!loginTime) return;

    const ONE_HOUR = 60 * 60 * 1000;
    const elapsed = Date.now() - loginTime;
    const remaining = ONE_HOUR - elapsed;

    if (remaining <= 0) {
        logout();
        return;
    }

    setTimeout(() => {
        alert("Your session has expired. You will be logged out.");
        logout();
    }, remaining);
}

loadFuelPrices();
userAccess();
welcomeMessage();
checkPompisteSession();

// async function checkAccess() {
//     try {
//     const res = await fetch("https://api64.ipify.org?format=json");
//     const data = await res.json();
//     const ip = data.ip;

//         //List of allowed IPs/networks
//     const allowed = ["41.216.105.56", "41.186.132.111"];

//     if (!allowed.includes(ip)) {
//         document.body.innerHTML = "<h1>🚫 Access Denied</h1>";        
//     }
//     } catch (err) {
//     console.error("Failed to check access", err);
//     }
// }

// checkAccess();