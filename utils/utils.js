function welcomeMessage() {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68a9b3e90029e6a10ff5");

    const account = new Appwrite.Account(client);

    // ✅ Check if user is logged in
    account.get()
    .then(user => {
        console.log("User is logged in:", user);
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

    console.log(currentPage);    

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
        console.log(admin,"Hello");
        
        
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
    try {
        // Use AllOrigins "raw" endpoint
        const proxy = "https://api.allorigins.win/raw?url=";
        const url = "https://www.globalpetrolprices.com/Rwanda/";
        const response = await fetch(proxy + encodeURIComponent(url));

        if (!response.ok) {
            throw new Error("Network response was not ok: " + response.status);
        }

        // Get the HTML directly
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Select the table rows
        const rows = doc.querySelectorAll("table tbody tr");

        if (rows.length >= 2) {
            const pmsPrice = rows[0].querySelectorAll("td")[1].textContent.trim() + " RWF";
            const agoPrice = rows[1].querySelectorAll("td")[1].textContent.trim() + " RWF";

            document.getElementById("pmsPrice").textContent = pmsPrice.toLocaleString();
            document.getElementById("agoPrice").textContent = agoPrice.toLocaleString();
        } else {
            console.error("❌ Table rows not found");
        }
    } catch (err) {
        console.error("⚠️ Error fetching fuel prices:", err);
        document.getElementById("pmsPrice").textContent = "Error";
        document.getElementById("agoPrice").textContent = "Error";
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
    alert("Logged out successfully");
    window.location.href= "/testing_projects/auth/sign-in/sign-in";
    
  } catch (error) {
    console.log("error for page access",error);
  }
}


loadFuelPrices();
userAccess();
welcomeMessage();

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