// custom hook
//if undefined => we are on the server
//if not => we are on the browser
export const isServer =() => typeof window ==="undefined";