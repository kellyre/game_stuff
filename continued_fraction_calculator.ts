document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('fractionForm') as HTMLFormElement;
    const resultDiv = document.getElementById('result') as HTMLDivElement;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputElement = document.getElementById('inputNumber') as HTMLInputElement;
        const inputValue = parseFloat(inputElement.value);
        
        if (isNaN(inputValue)) {
            resultDiv.innerHTML = '<p>Please enter a valid number.</p>';
            return;
        }
        
        const { continuedFraction, partialFractions } = calculateContinuedFraction(inputValue);
        displayResults(inputValue, continuedFraction, partialFractions);
    });
    
    function calculateContinuedFraction(num: number): { 
        continuedFraction: number[], 
        partialFractions: { fraction: string, decimal: number }[] 
    } {
        const continuedFraction: number[] = [];
        const partialFractions: { fraction: string, decimal: number }[] = [];
        
        let x = num;
        const maxIterations = 20; // Limit iterations to prevent infinite loops
        
        for (let i = 0; i < maxIterations; i++) {
            const intPart = Math.floor(x);
            continuedFraction.push(intPart);
            
            // Calculate partial fraction at each step
            if (i === 0) {
                partialFractions.push({
                    fraction: `${intPart}`,
                    decimal: intPart
                });
            } else {
                calculatePartialFraction(continuedFraction, partialFractions);
            }
            
            // Check if we've reached the end (no fractional part)
            const fractionalPart = x - intPart;
            if (fractionalPart < 1e-10) break;
            
            // Continue with reciprocal of fractional part
            x = 1 / fractionalPart;
        }
        
        return { continuedFraction, partialFractions };
    }
    
    function calculatePartialFraction(cf: number[], partialFractions: { fraction: string, decimal: number }[]) {
        let n = 1;
        let d = cf[cf.length - 1];
        
        // Work backwards through the continued fraction
        for (let i = cf.length - 2; i >= 0; i--) {
            const temp = n;
            n = cf[i] * d + temp;
            if (i === 0) break;
            
            const tempD = d;
            d = n;
            n = tempD;
        }
        
        partialFractions.push({
            fraction: `${n}/${d}`,
            decimal: n / d
        });
    }
    
    function displayResults(original: number, cf: number[], partials: { fraction: string, decimal: number }[]) {
        let html = `
            <h2>Results for ${original}</h2>
            <h3>Continued Fraction:</h3>
            <p>[${cf.join(', ')}]</p>
            
            <h3>Partial Fractions:</h3>
            <table>
                <tr>
                    <th>Step</th>
                    <th>Fraction</th>
                    <th>Decimal</th>
                    <th>Error</th>
                </tr>
        `;
        
        partials.forEach((pf, index) => {
            const error = Math.abs(original - pf.decimal);
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${pf.fraction}</td>
                    <td>${pf.decimal}</td>
                    <td>${error.toExponential(6)}</td>
                </tr>
            `;
        });
        
        html += '</table>';
        resultDiv.innerHTML = html;
    }
});