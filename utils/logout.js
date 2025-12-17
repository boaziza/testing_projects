async function logout() {

  try {
    const client = new Appwrite.Client()
      .setEndpoint("https://cloud.appwrite.io/v1") 
      .setProject("68c3ec870024955539b0")
    ;

    const account = new Appwrite.Account(client);
    
    await account.deleteSession("current");
    alert("Logged out successfully");
    window.location.href= "/testing_projects/auth/sign-in/sign-in";
    
  } catch (error) {
    console.log("error for page access",error);
  }
}