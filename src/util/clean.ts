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
    value: string | undefined | null,
    throwErrors = false
): string | null | undefined => {
    value = contactInfo(value)

    if (value === undefined || value === null) {
        return value
    }

    try {
        return normalizePhoneNumber(value)
    } catch (e) {
        if (throwErrors) {
            throw e
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
