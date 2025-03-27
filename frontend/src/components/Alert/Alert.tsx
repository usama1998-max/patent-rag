import { Notification, toaster } from "rsuite";


const Alert = (message: string, alertType: "success" | "info" | "error" | "warning") => {
    const notification = (
    <Notification type={alertType} header={alertType.toUpperCase()} closable>
        {message}
    </Notification>
  );

  toaster.push(notification, { placement: "topEnd", duration: 3000 });
}

export default Alert;
