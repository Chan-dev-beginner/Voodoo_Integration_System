# Voodoo Cafe management prototype

A responsive Flutter prototype based on the Voodoo Cafe reference screens,
covering login, admin and barista roles, POS, orders, inventory, and restocks.

## Run locally

```shell
flutter pub get
flutter run
```

Select an Android tablet, phone, web browser, or other connected Flutter device
when prompted. The layout adapts its navigation and content to available screen
space and orientation.

Use any non-empty username and password on the demo login screen, and choose a
role. The POS creates orders and deducts stock; baristas can request restocks;
admins can approve or reject requests and review shift sales. Logging out opens
a shift closeout with the shift total and order-by-order details before
returning to login.

Accounts and data are in-memory demo data. Authentication, persistent storage,
and connections to external POS, inventory, or ordering services are not
configured.
