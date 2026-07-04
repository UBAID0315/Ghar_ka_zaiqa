import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import ChefDashboard from "./pages/ChefDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <CartProvider>
                <Layout>
                  <Home />
                </Layout>
              </CartProvider>
            }
          />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/chef" element={<ChefDashboard />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
