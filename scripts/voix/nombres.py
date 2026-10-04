# Nombres en toutes lettres, pour que la voix les dise bien : « 71 » → « soixante et onze ».
# Français (de 0 à 999 999, ordinaux) et anglais (de 0 à 999 999), sans dépendance.

FR_UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
            'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
FR_TENS = {20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante'}


def fr_below_100(n):
    if n <= 16:
        return FR_UNITS[n]
    if n < 20:
        return 'dix-' + FR_UNITS[n - 10]
    if n < 70:
        tens, unit = divmod(n, 10)
        word = FR_TENS[tens * 10]
        if unit == 0:
            return word
        return f'{word} et un' if unit == 1 else f'{word}-{FR_UNITS[unit]}'
    if n < 80:
        return 'soixante et onze' if n == 71 else 'soixante-' + fr_below_100(n - 60)
    if n == 80:
        return 'quatre-vingts'
    return 'quatre-vingt-' + fr_below_100(n - 80)


def fr_below_1000(n):
    hundreds, rest = divmod(n, 100)
    if hundreds == 0:
        return fr_below_100(rest)
    head = 'cent' if hundreds == 1 else f'{FR_UNITS[hundreds]} cent'
    if rest == 0:
        return head if hundreds == 1 else head + 's'
    return f'{head} {fr_below_100(rest)}'


def fr_cardinal(n):
    if n < 1000:
        return fr_below_1000(n)
    thousands, rest = divmod(n, 1000)
    # « quatre-vingt mille », « deux cent mille » : pas de « s » devant mille
    head = 'mille' if thousands == 1 else f'{fr_below_1000(thousands).removesuffix("s")} mille'
    return head if rest == 0 else f'{head} {fr_below_1000(rest)}'


def fr_ordinal(n, feminine=False):
    if n == 1:
        return 'première' if feminine else 'premier'
    word = fr_cardinal(n)
    if word.endswith('cinq'):
        return word + 'uième'
    if word.endswith('neuf'):
        return word[:-1] + 'vième'
    if word.endswith('e'):
        word = word[:-1]
    if word.endswith('s') and (word.endswith('cents') or word.endswith('vingts')):
        word = word[:-1]
    return word + 'ième'


EN_UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
            'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def en_below_1000(n):
    hundreds, rest = divmod(n, 100)
    if rest < 20:
        tail = EN_UNITS[rest]
    else:
        tens, unit = divmod(rest, 10)
        tail = EN_TENS[tens] + (f'-{EN_UNITS[unit]}' if unit else '')
    if hundreds == 0:
        return tail
    head = f'{EN_UNITS[hundreds]} hundred'
    return head if rest == 0 else f'{head} and {tail}'


def en_cardinal(n):
    if n < 1000:
        return en_below_1000(n)
    thousands, rest = divmod(n, 1000)
    head = f'{en_below_1000(thousands)} thousand'
    if rest == 0:
        return head
    return f'{head} and {en_below_1000(rest)}' if rest < 100 else f'{head} {en_below_1000(rest)}'


def say_number(text, lang='fr'):
    """« 37 » → « trente-sept » ; « 2,5 » → « deux virgule cinq » ; « 1er » → « premier » ; « 3e » → « troisième »."""
    import re
    m = re.fullmatch(r'(\d+)(er|re|e|ème)?', text)
    cardinal = fr_cardinal if lang == 'fr' else en_cardinal
    if m:
        value, suffix = int(m.group(1)), m.group(2)
        if suffix and lang == 'fr':
            return fr_ordinal(value, feminine=suffix == 're')
        return cardinal(value)
    whole, _, decimals = text.replace('.', ',').partition(',')
    word = 'virgule' if lang == 'fr' else 'point'
    return f'{cardinal(int(whole))} {word} {cardinal(int(decimals))}'


if __name__ == '__main__':
    checks = {
        '0': 'zéro', '1': 'un', '16': 'seize', '17': 'dix-sept', '21': 'vingt et un', '22': 'vingt-deux',
        '70': 'soixante-dix', '71': 'soixante et onze', '72': 'soixante-douze', '79': 'soixante-dix-neuf',
        '80': 'quatre-vingts', '81': 'quatre-vingt-un', '90': 'quatre-vingt-dix', '91': 'quatre-vingt-onze',
        '99': 'quatre-vingt-dix-neuf', '100': 'cent', '101': 'cent un', '200': 'deux cents', '201': 'deux cent un',
        '280': 'deux cent quatre-vingts', '347': 'trois cent quarante-sept', '1000': 'mille', '1001': 'mille un',
        '2000': 'deux mille', '80000': 'quatre-vingt mille', '200000': 'deux cent mille',
        '1er': 'premier', '1re': 'première', '2e': 'deuxième', '5e': 'cinquième', '9e': 'neuvième',
        '4e': 'quatrième', '2,5': 'deux virgule cinq',
    }
    for text, expected in checks.items():
        assert say_number(text) == expected, (text, say_number(text), expected)
    assert say_number('21', 'en') == 'twenty-one'
    assert say_number('100', 'en') == 'one hundred'
    assert say_number('105', 'en') == 'one hundred and five'
    print('nombres : tout est juste')
