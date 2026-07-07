import "../css/navbar.css";

function Navbar() {

    const today = new Date().toLocaleDateString();

    return (

        <header className="navbar">

            <h2>Crusher Inventory Management System</h2>

            <span>{today}</span>

        </header>

    );
}

export default Navbar;