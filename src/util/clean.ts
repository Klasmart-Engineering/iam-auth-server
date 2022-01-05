import normalizePhoneNumber from './cleanPhoneNumber'

/*
this function both cleans and validates
and will throw errors for invalid numbers

If you're already doing validation seperatly
and don't want to throw more errors
or you want invalid values to default to undefined
call with `throwErrors=true`
If your using this function to validate `value`
or know that `value` is already valid
call with `throwErrors=false`
*/
const cleanPhone = (
    phoneNumber: string | undefined | null,
    throwErrors = false
): string | null | undefined => {
    phoneNumber = contactInfo(phoneNumber)

    if (!phoneNumber) {
        return phoneNumber
    }

    try {
        return normalizePhoneNumber(phoneNumber)
    } catch (e: any) {
        if (throwErrors) {
            console.log(e.code)
        } else {
            return undefined
        }
    }
}

const normalizedLowercaseTrimmed = (x?: string) =>
    x?.normalize('NFKC').toLowerCase().trim()

const contactInfo = (value: string | null | undefined) => {
    if (value === null || value === '') return null
    if (typeof value === 'undefined') return undefined
    return normalizedLowercaseTrimmed(value)
}

export default cleanPhone
