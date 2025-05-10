(() => {
    window['registerPasswordInputs'] = (input, inputAgain, strengthMeter) => {
        input.addEventListener('input', () => {
            const password = input.value
            let score = 0
            const maxScore = 5
            if (/[0-9]+/g.test(password)) score++
            if (/[a-z]+/g.test(password)) score++
            if (/[A-Z]+/g.test(password)) score++
            if (/[^\w\s]+/g.test(password)) score++
            if (password.length > 16) score++
            strengthMeter.value = Math.round((score * 100) / maxScore).toString()
        })
    
        inputAgain.addEventListener('input', () => {
            const password = input
            const passwordAgain = inputAgain
            if (password.value !== passwordAgain.value) {
                passwordAgain.setCustomValidity('The passwords mismatch')
            } else {
                passwordAgain.setCustomValidity('')
            }
        })
    }
})()
