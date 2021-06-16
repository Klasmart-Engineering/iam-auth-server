import escapeStringRegexp from 'escape-string-regexp'

export function compileDomainRegex(domain: string): RegExp {
    return new RegExp(
        `^https://(.*\\.)?${escapeStringRegexp(domain)}(:[0-9]{1,5})?$`
    )
}
