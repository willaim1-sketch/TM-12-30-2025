import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// AccountPage now redirects to homepage
// Users register only for order tracking - no account settings needed
const AccountPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to homepage
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default AccountPage;
