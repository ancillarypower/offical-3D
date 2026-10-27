import { useAuth } from '../auth/AuthContext';

function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="ProfilePage">
      <h1>Profile</h1>
      <p>
        Signed in as <strong>{user}</strong>
      </p>
    </div>
  );
}

export default ProfilePage;
