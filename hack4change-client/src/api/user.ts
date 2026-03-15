export interface User {
  email: string;
  password: string;
  tel: string;
  fullName: string;
  role: string | null;
}

export const postRegister = async ( user:User ): Promise<User> => {
    const result = {email: "", password: "", tel: "", fullName: "", role: "Donator"};
    return result;
}

export const getUser = async ( email:string,password:string ): Promise<User> => {
    // const response = await fetch("api/role");
    
    // if (!response.ok) {
    //     throw new Error(`Response status:  ${response.status}`);
    // }
    
    // const result = await response.text();
    const result = {email: "leo@thisplace.ca", password: "", tel: "", fullName: "Leo T", role: "Organization User" };
    return result;
};
