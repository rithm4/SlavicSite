import { OrderWizard } from './components/OrderWizard'
import './App.css'

function App() {
  return (
    <>
      <div className="container">
        <div className="page-intro">
          <h1>Comandă online</h1>
          <p>Configurați comanda în câțiva pași și primiți imediat contul de plată în format PDF.</p>
        </div>
        <OrderWizard />
      </div>
    </>
  )
}

export default App
