import "../css/navbar.css";

function Navbar() {

    const today = new Date().toLocaleDateString();

    return (

        <header className="navbar">

            <div class="nav-logo">
    <h2>WHITE CLOUD</h2>
    <p>GLOBAL SOLUTIONS</p>
</div>

            <span>{today}</span>

        </header>

    );
}

export default Navbar;