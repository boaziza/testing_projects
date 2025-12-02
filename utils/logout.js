async function logout(event) {
  const btn = event.currentTarget;   
  const originalText = btn.textContent;

  btn.disabled = true;
  btn.textContent = "Loading..."; 

  try {
    const client = new Appwrite.Client()
        .setEndpoint("https://cloud.appwrite.io/v1") 
        .setProject("68c3ec870024955539b0");

    const account = new Appwrite.Account(client);
    
    await account.deleteSession("current");
    alert("Logged out successfully");
    window.location.href= "../../auth/sign-in/sign-in.html";
    
  } catch (error) {
    console.log("error for page access",error);
  } finally {

    btn.disabled = false;
    btn.textContent = originalText;
        
  }
}