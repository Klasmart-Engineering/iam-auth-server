import normalizePhoneNumber from './cleanPhoneNumber'

const cleanPhone = (value: string | undefined): string | undefined => {
    const phoneNumber = value?.trim()

    if (!phoneNumber) {
        return phoneNumber
    }

    try {
        return normalizePhoneNumber(phoneNumber)
    } catch (e: any) {
        console.error('error normalizing phone number ', e)
        return phoneNumber
    }
}

export default cleanPhone
