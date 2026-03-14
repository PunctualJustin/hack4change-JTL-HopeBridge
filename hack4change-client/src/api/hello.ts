export const getHello = async () => {
    const response = await fetch("api/hello");
    
    if (!response.ok) {
        throw new Error(`Response status:  ${response.status}`)
    }
    
    const result = await response.text();
    
    return result;
};