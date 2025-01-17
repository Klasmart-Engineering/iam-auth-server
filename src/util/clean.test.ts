import cleanPhone from './clean'

describe('cleanPhone', () => {
    it('if the phoneNumber is undefined, returns undefined', () => {
        expect(cleanPhone(undefined)).toBe(undefined)
    })

    it('if the phoneNumber is an empty string, returns the empty string', () => {
        expect(cleanPhone('')).toBe('')
    })

    it('if the phoneNumber is invalid, returns identity', () => {
        const input = 'not-a-phone-number'
        expect(cleanPhone(input)).toBe(input)
    })

    it('removes spaces', () => {
        expect(cleanPhone(' +4412345678910 ')).toEqual('+4412345678910')
    })

    // tests copied from https://bitbucket.org/calmisland/go-server-utils/src/master/phoneutils/phone_numbers_test.go

    describe('when phone number has spaces or lines with plus sign', () => {
        const validUncleanPhoneNumbers = new Map([
            ['+(1)415 555 2671', '+14155552671'],
            ['+(44)207-183-8750', '+442071838750'],
            ['+(44)207 1838-7503', '+4420718387503'],
            ['+(44)207-183875038', '+44207183875038'],
            ['+(44)207 183875-0380', '+442071838750380'],
            ['+(55)155256325', '+55155256325'],
            ['+(55)11552563257', '+5511552563257'],
            ['+(55)115 5256 32572', '+55115525632572'],
            ['+(55)115-5256-3257-26', '+551155256325726'],
            ['+(1)1235550100', '+11235550100'],
            ['+104155552671', '+14155552671'],
            ['+4402071838750', '+442071838750'],
            ['+44020718387503', '+4420718387503'],
            ['+440207183875038', '+44207183875038'],
            ['+4402071838750380', '+442071838750380'],
            ['+5501155256325', '+551155256325'],
            ['+55011552563257', '+5511552563257'],
            ['+550115525632572', '+55115525632572'],
            ['+5501155256325726', '+551155256325726'],
            ['+101235550100', '+11235550100'],
        ])

        const phoneValidation = /^\+[1-9]\d{1,14}$/

        const isValidPhoneNumber = (phoneNumber: string) => {
            return phoneValidation.test(phoneNumber)
        }

        for (const [num, cleaned] of validUncleanPhoneNumbers.entries()) {
            it(`cleans ${num} into a valid E164 number`, () => {
                const cleanNum = cleanPhone(num)
                expect(cleanNum).toEqual(cleaned)
                expect(isValidPhoneNumber(cleanNum as string)).toBe(true)
            })
        }
    })

    describe('when phone number has spaces or lines or letters', () => {
        const invalidPhoneNumbers: string[] = [
            '14155552671',
            '1415a5552671',
            '14155552671a',
            '4420718387503890',
            's5511552563257264',
            '.1xxx5550100',
            '(1)4155552671',
            'a(1)415a5552671',
            '[(1)4155552671a',
            'a(44)20718387503890',
            '.(44)207 18387 503890',
            'c(44)207-18387-503890',
            'f(55)11552563257264',
            '(55)1155 25632-57264',
            '(1)xxx5550100',
        ]

        for (const num of invalidPhoneNumbers) {
            it(`cannot clean ${num} into a valid E164 number`, () => {
                expect(cleanPhone(num)).toBe(num)
            })
        }
    })

    describe('when phone number has valid country call code', () => {
        const parsedNumbers = new Map([
            [
                '+14155552671',
                {
                    CountryCallCode: 1,
                    LocalPhoneNumber: 4155552671,
                },
            ],
            [
                '+442071838750',
                {
                    CountryCallCode: 44,
                    LocalPhoneNumber: 2071838750,
                },
            ],
            [
                '+4420718387503',
                {
                    CountryCallCode: 44,
                    LocalPhoneNumber: 20718387503,
                },
            ],
            [
                '+44207183875038',
                {
                    CountryCallCode: 44,
                    LocalPhoneNumber: 207183875038,
                },
            ],
            [
                '+442071838750380',
                {
                    CountryCallCode: 44,
                    LocalPhoneNumber: 2071838750380,
                },
            ],
            [
                '+551155256325',
                {
                    CountryCallCode: 55,
                    LocalPhoneNumber: 1155256325,
                },
            ],
            [
                '+5511552563257',
                {
                    CountryCallCode: 55,
                    LocalPhoneNumber: 11552563257,
                },
            ],
            [
                '+55115525632572',
                {
                    CountryCallCode: 55,
                    LocalPhoneNumber: 115525632572,
                },
            ],
            [
                '+551155256325726',
                {
                    CountryCallCode: 55,
                    LocalPhoneNumber: 1155256325726,
                },
            ],
            [
                '+11235550100',
                {
                    CountryCallCode: 1,
                    LocalPhoneNumber: 1235550100,
                },
            ],
        ])

        for (const [num, parsed] of parsedNumbers) {
            it(`parsed ${num} correctly`, () => {
                const cleanNum = cleanPhone(num)
                if (cleanNum == null) {
                    expect(false)
                } else {
                    expect(cleanNum).toEqual(
                        `+${parsed.CountryCallCode}${parsed.LocalPhoneNumber}`
                    )
                }
            })
        }
    })
})
