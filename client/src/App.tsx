import { Footer } from "./components/footer";
import { Header } from "./components/header";
import Home from "./pages/home";

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Home />
      <Footer />
    </div>
  );
}

export default App;
