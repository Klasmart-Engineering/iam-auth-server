export function validateString(string?: any): string | false {
    if (typeof string !== "string") { return false }
    return string
}