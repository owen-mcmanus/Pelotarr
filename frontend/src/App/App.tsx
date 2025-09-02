import { Routes, Route, Navigate } from "react-router-dom";
import Header from "../Components/Header.tsx";
import NavBar from "../Components/NavBar.tsx";

// import Calendar from "../Pages/Calendar";
import Main from "../Pages/Main";
import NotFound from "../Pages/NotFound";
import Women from "../Pages/Women.tsx";
import CX from "../Pages/CX.tsx";
import Search from "../Pages/Search.tsx";

function App() {

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header/>
        <div style={{ display: "flex", width: "100%", flex:1, }}>
        <NavBar/>
        <Routes>
            <Route path="/" element={<Navigate to="/men" replace />} />
            <Route path="/men" element={<Main />} />
            <Route path="/women" element={<Main/>} />
            <Route path="/cx" element={<Main/>} />
            <Route path="/search" element={<Main/>} />
            <Route path="/search/:query" element={<Main />} />
            {/*<Route path="/calendar" element={<Calendar />} />*/}
            <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
    </div>
  )
}

export default App
