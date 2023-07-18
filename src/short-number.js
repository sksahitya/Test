const numberToSubscriptChar = (number) => {
    switch (number) {
        case '0': return '₀'
        case '1': return '₁'
        case '2': return '₂'
        case '3': return '₃'
        case '4': return '₄'
        case '5': return '₅'
        case '6': return '₆'
        case '7': return '₇'
        case '8': return '₈'
        case '9': return '₉'
        default: return number
    }
}
const numberToSubscriptString = (number) => {
    const str = number.toString()
    let subscript = ''
    for (let i = 0; i < str.length; i++) {
        subscript += numberToSubscriptChar(str[i])
    }
    return subscript
}
const toShortenedNumber = ({wholeStr, extraWhole, decimalStr, startingZeroes, endingDecimal, needsEllipsis}) => {
    let str = wholeStr
    if (extraWhole) str += numberToSubscriptString(extraWhole)
    if (decimalStr) str += '.' + decimalStr
    if (startingZeroes) str += numberToSubscriptString(startingZeroes)
    if (endingDecimal) str += endingDecimal
    if (needsEllipsis) str += '...'
    return str
}
const addCommas = (whole, extraWhole) => {
    const wholeLength = whole.length + extraWhole
    const needsCommas = wholeLength > 3
    if (!needsCommas) return whole
    let str = ''
    let k = 0
    for (let i = wholeLength - 1; i >= 0; i--, k++) {
        if (k >= extraWhole) {
            let char = whole[i]
            if (k > 0 && char !== '-' && k % 3 === 0) {
                str = char + ',' + str
            } else {
                str = char + str
            }
        }
    }
    return str
}
const shortenNumber = (number, maxShown, noDots) => {
    maxShown ||= 5
    if (typeof number === 'undefined' || number === null) return { wholeStr: '0' }
    if (typeof number === 'string') number = number.replace(/,/g, '')
    const n = new BigNumber(number)
    if (n.isNaN() || !n.isFinite()) return { wholeStr: '0' }
    let str = n.toString()
    if (str.length <= maxShown) return { wholeStr: str }
    const endsInZero = str[str.length - 1] === '0' && str.indexOf('.') !== -1
    if (endsInZero) {
        for (let i = str.length - 1; i >= 0; i--) {
            if (str[i] !== '0') {
                str = str.slice(0, i + 1)
                break
            }
        }
    }
    const [whole, decimal] = str.split('.')
    const extraDecimals = Math.max(0, decimal?.length - maxShown)
    const extraWhole = Math.max(0, whole?.length - maxShown)
    let wholeStr = '', decimalStr = '', startingZeroes, endingDecimal = '', needsEllipsis
    if (whole.length <= maxShown && decimal.length <= maxShown) {
        if (decimal.length) {
            wholeStr = addCommas(whole, extraWhole) + '.' + decimal
        } else {
            wholeStr = addCommas(whole, extraWhole)
        }
        return { wholeStr }
    }
    wholeStr = whole.length <= maxShown ? whole : whole.slice(0, maxShown)
    if (decimal?.length > 0) {
        if (!extraDecimals) decimalStr = decimal
        else {
            const startsWith0 = decimal[0] === '0'
            if (startsWith0) {
                for (let i = 0; i < decimal.length; i++) {
                    if (typeof startingZeroes === 'undefined' && decimal[i] !== '0') {
                        startingZeroes = i - 1
                        if (startingZeroes === 1) { startingZeroes = 0; decimalStr += '0' }
                        decimalStr += '0'
                        endingDecimal += decimal[i]
                    } else if (i - startingZeroes <= maxShown) {
                        endingDecimal += decimal[i]
                    } else if (typeof startingZeroes !== 'undefined') {
                        needsEllipsis = true
                        break
                    }
                }
            } else {
                decimalStr = `${decimal.slice(0, maxShown)}`
                needsEllipsis = true
            }
        }
    }
    if (noDots) needsEllipsis = false;
    return { wholeStr: addCommas(wholeStr, extraWhole), extraWhole, decimalStr, startingZeroes, endingDecimal, needsEllipsis }
}
export const shortNumber = (number, maxShown, noDots) => toShortenedNumber(shortenNumber(number, maxShown, noDots))