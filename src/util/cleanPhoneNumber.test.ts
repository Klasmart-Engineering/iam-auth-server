import normalizePhoneNumber from './cleanPhoneNumber'

describe('normalizePhoneNumber', () => {
    describe('when the phone number is empty', () => {
        const phoneNumber = ''
        it('should throw an Error', () => {
            expect(() => normalizePhoneNumber(phoneNumber)).toThrow(Error)
        })
    })

    describe('when the phone number has double zeros as prefix', () => {
        const prefix = '00'
        const phoneNumber = '732333333'
        it('should remove the prefix zeros and add + sign', () => {
            const cleanPhoneNumber = normalizePhoneNumber(
                `${prefix}${phoneNumber}`
            )
            expect(cleanPhoneNumber).toEqual(`+${phoneNumber}`)
        })
    })

    describe('when the phone number has + sign as prefix', () => {
        const prefix = '+'
        const phoneNumber = '732333333'
        it('should remove the prefix and add + sign', () => {
            const cleanPhoneNumber = normalizePhoneNumber(
                `${prefix}${phoneNumber}`
            )
            expect(cleanPhoneNumber).toEqual(`+${phoneNumber}`)
        })
    })

    describe('when the phone number has different prefix than 00 or +', () => {
        const prefix = '4'
        const phoneNumber = '732333333'
        it('should throw error', () => {
            expect(() =>
                normalizePhoneNumber(`${prefix}${phoneNumber}`)
            ).toThrow(Error)
        })
    })

    describe('when the phone number equals 00', () => {
        const phoneNumber = '00'
        it('should throw error', () => {
            expect(() => normalizePhoneNumber(phoneNumber)).toThrow(Error)
        })
    })

    describe('when the phone number equals country code prefix is invalid', () => {
        const phoneNumber = '+0733228558'
        it('should throw error - Unable to get the country code from the phone number', () => {
            expect(() => normalizePhoneNumber(phoneNumber)).toThrow(
                Error('Unable to get the country code from the phone number')
            )
        })
    })

    describe('when the country code is valid and the rest of the local phone number has leading zeros', () => {
        const phoneNumber = '+4000722333777'
        it('should keep the country code and remove the leading zeros', () => {
            expect(normalizePhoneNumber(phoneNumber)).toEqual('+40722333777')
        })
    })

    describe('when the phone number has spaces inside', () => {
        const phoneNumber = '+1 723 723 7233'
        it('should remove the spaces inside from the phone number', () => {
            expect(normalizePhoneNumber(phoneNumber)).toEqual('+17237237233')
        })
    })

    describe('when the phone number has special characters inside', () => {
        const phoneNumber = '+1-723-732(7233)'
        it('should remove the special characters inside', () => {
            expect(normalizePhoneNumber(phoneNumber)).toEqual('+17237327233')
        })
    })

    describe('when the phone number has special characters and spaces inside', () => {
        const phoneNumber = '+1-723-732 (72 33)'
        it('should remove the special characters and spaces inside', () => {
            expect(normalizePhoneNumber(phoneNumber)).toEqual('+17237327233')
        })
    })

    describe('when the phone number has special characters. letters and spaces inside', () => {
        const phoneNumber = '+1-723-732z (72 33)'
        it('should remove the special characters and spaces inside', () => {
            expect(normalizePhoneNumber(phoneNumber)).toEqual('+1723732z7233')
        })
    })
})
