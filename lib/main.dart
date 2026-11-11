import 'package:flutter/material.dart';

void main() {
  runApp(const CafeManagementApp());
}

const _ink = Color(0xFFF6F1F5);
const _muted = Color(0xFFC0B7C2);
const _paper = Color(0xFF131116);
const _surface = Color(0xD9232028);
const _line = Color(0xFF504751);
const _plum = Color(0xFF936BCE);
const _green = Color(0xFF79D88B);
const _amber = Color(0xFFF2C66D);

enum UserRole { admin, barista }

enum CafeSection { overview, pos, orders, inventory, restocks, analytics }

enum _SessionScreen { login, shiftSummary }

class Product {
  Product({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.stock,
    required this.unit,
    required this.color,
    this.emoji = '☕',
  });

  final String id;
  final String name;
  final String category;
  final double price;
  int stock;
  final String unit;
  final Color color;
  final String emoji;
}

class CafeOrder {
  CafeOrder({
    required this.number,
    required this.customer,
    required this.items,
    required this.total,
    required this.time,
    this.status = 'New',
  });

  final String number;
  final String customer;
  final String items;
  final double total;
  final String time;
  String status;
}

class RestockRequest {
  RestockRequest({
    required this.product,
    required this.quantity,
    required this.requestedBy,
    required this.time,
    this.status = 'Pending',
  });

  final Product product;
  final int quantity;
  final String requestedBy;
  final String time;
  String status;
}

class CafeManagementApp extends StatelessWidget {
  const CafeManagementApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Voodoo Cafe',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: _paper,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _plum,
          brightness: Brightness.dark,
          surface: _surface,
        ),
        fontFamily: 'Arial',
      ),
      home: const CafeHomePage(),
    );
  }
}

class CafeHomePage extends StatefulWidget {
  const CafeHomePage({super.key});

  @override
  State<CafeHomePage> createState() => _CafeHomePageState();
}

class _CafeHomePageState extends State<CafeHomePage> {
  UserRole _role = UserRole.admin;
  UserRole _loginRole = UserRole.admin;
  _SessionScreen? _sessionScreen = _SessionScreen.login;
  CafeSection _section = CafeSection.overview;
  String _category = 'All';
  String _orderFilter = 'All orders';
  final Map<String, int> _cart = {};
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  double _shiftSales = 42.25;
  int _ordersToday = 4;
  int _nextOrderNumber = 1049;

  late final List<Product> _products = [
    Product(
      id: '001',
      name: 'Oat latte',
      category: 'Coffee',
      price: 5.50,
      stock: 24,
      unit: 'cups',
      color: const Color(0xFFF2E5D7),
      emoji: '☕',
    ),
    Product(
      id: '002',
      name: 'Flat white',
      category: 'Coffee',
      price: 4.75,
      stock: 18,
      unit: 'cups',
      color: const Color(0xFFE9E0D7),
      emoji: '🥛',
    ),
    Product(
      id: '003',
      name: 'Cold brew',
      category: 'Coffee',
      price: 5.00,
      stock: 12,
      unit: 'cups',
      color: const Color(0xFFE2E9E5),
      emoji: '🧊',
    ),
    Product(
      id: '004',
      name: 'Matcha',
      category: 'Tea',
      price: 5.25,
      stock: 9,
      unit: 'cups',
      color: const Color(0xFFE5EBDD),
      emoji: '🍵',
    ),
    Product(
      id: '005',
      name: 'Butter croissant',
      category: 'Bakery',
      price: 3.75,
      stock: 7,
      unit: 'pieces',
      color: const Color(0xFFF3E8D3),
      emoji: '🥐',
    ),
    Product(
      id: '006',
      name: 'Banana bread',
      category: 'Bakery',
      price: 4.00,
      stock: 3,
      unit: 'slices',
      color: const Color(0xFFEFE4D7),
      emoji: '🍞',
    ),
  ];

  late final List<CafeOrder> _orders = [
    CafeOrder(
      number: '#1048',
      customer: 'Alex Morgan',
      items: '2 × Oat latte, 1 × Croissant',
      total: 14.75,
      time: '10:42 AM',
      status: 'Preparing',
    ),
    CafeOrder(
      number: '#1047',
      customer: 'Walk-in',
      items: '1 × Cold brew, 1 × Banana bread',
      total: 9.00,
      time: '10:38 AM',
      status: 'New',
    ),
    CafeOrder(
      number: '#1046',
      customer: 'Jamie Lee',
      items: '2 × Flat white',
      total: 9.50,
      time: '10:31 AM',
      status: 'Ready',
    ),
    CafeOrder(
      number: '#1045',
      customer: 'Walk-in',
      items: '1 × Matcha, 1 × Croissant',
      total: 9.00,
      time: '10:24 AM',
      status: 'Completed',
    ),
  ];

  late final List<RestockRequest> _requests = [
    RestockRequest(
      product: _products[5],
      quantity: 12,
      requestedBy: 'Mia Chen',
      time: '10:16 AM',
    ),
    RestockRequest(
      product: _products[3],
      quantity: 2,
      requestedBy: 'Sam Rivera',
      time: '9:52 AM',
    ),
    RestockRequest(
      product: _products[0],
      quantity: 10,
      requestedBy: 'Mia Chen',
      time: 'Yesterday',
      status: 'Approved',
    ),
  ];

  List<CafeSection> get _sections => _role == UserRole.admin
      ? CafeSection.values
      : const [
          CafeSection.overview,
          CafeSection.pos,
          CafeSection.orders,
          CafeSection.inventory,
          CafeSection.restocks,
        ];

  String get _roleName => _role == UserRole.admin ? 'Admin' : 'Barista';
  String get _staffName =>
      _role == UserRole.admin ? 'Taylor Brooks' : 'Mia Chen';

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (_sessionScreen != null) {
          return _sessionScreen == _SessionScreen.login
              ? _loginPage()
              : _shiftSummaryPage(constraints.maxWidth < 760);
        }
        final compact = constraints.maxWidth < 920;
        return Scaffold(
          body: _VoodooBackdrop(
            child: SafeArea(
              child: Row(
                children: [
                  if (!compact) _buildSidebar(),
                  Expanded(
                    child: Column(
                      children: [
                        _buildTopBar(compact),
                        Expanded(child: _buildPageContent(compact)),
                        if (compact) _buildBottomNavigation(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Widget _loginPage() {
    return Scaffold(
      backgroundColor: _paper,
      body: _VoodooBackdrop(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints:
                    BoxConstraints(minHeight: constraints.maxHeight - 40),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 690),
                    child: Container(
                      padding: const EdgeInsets.all(26),
                      decoration: BoxDecoration(
                        color: _surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: _line),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Container(
                              width: 58,
                              height: 58,
                              decoration: BoxDecoration(
                                color: _plum,
                                borderRadius: BorderRadius.circular(17),
                              ),
                              child: const Icon(
                                Icons.coffee_rounded,
                                color: Colors.white,
                                size: 31,
                              ),
                            ),
                          ),
                          const SizedBox(height: 15),
                          const Text(
                            'LOGIN',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.4,
                            ),
                          ),
                          const SizedBox(height: 5),
                          const Text(
                            'VOODOO CAFE · ADMIN & BARISTA ACCESS',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: Color(0xFFC7BBC5), fontSize: 12),
                          ),
                          const SizedBox(height: 24),
                          if (constraints.maxWidth >= 620)
                            _loginFieldRow(
                              key: const ValueKey('username-field'),
                              controller: _usernameController,
                              label: 'Username',
                            )
                          else
                            _loginTextField(
                              key: const ValueKey('username-field'),
                              controller: _usernameController,
                              label: 'Username',
                              icon: Icons.person_outline_rounded,
                            ),
                          const SizedBox(height: 13),
                          if (constraints.maxWidth >= 620)
                            _loginFieldRow(
                              key: const ValueKey('password-field'),
                              controller: _passwordController,
                              label: 'Password',
                              obscureText: true,
                            )
                          else
                            _loginTextField(
                              key: const ValueKey('password-field'),
                              controller: _passwordController,
                              label: 'Password',
                              icon: Icons.lock_outline_rounded,
                              obscureText: true,
                            ),
                          const SizedBox(height: 18),
                          const Text(
                            'SIGN IN AS',
                            style: TextStyle(
                              color: Color(0xFFC7BBC5),
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _loginRoleButton(
                                  UserRole.admin,
                                  Icons.admin_panel_settings_outlined,
                                ),
                              ),
                              const SizedBox(width: 9),
                              Expanded(
                                child: _loginRoleButton(
                                  UserRole.barista,
                                  Icons.local_cafe_outlined,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 19),
                          FilledButton.icon(
                            key: const ValueKey('login-button'),
                            onPressed: _login,
                            icon: const Icon(Icons.login_rounded, size: 18),
                            label: const Text('Log in'),
                            style: FilledButton.styleFrom(
                              backgroundColor: _plum,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(11),
                              ),
                            ),
                          ),
                          const SizedBox(height: 11),
                          const Text(
                            'Prototype demo: use any non-empty username and password.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Color(0xFFB2A6B0),
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _loginTextField({
    required Key key,
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool obscureText = false,
    bool showLabel = true,
  }) {
    return TextField(
      key: key,
      controller: controller,
      obscureText: obscureText,
      style: const TextStyle(color: _paper, fontSize: 13),
      decoration: InputDecoration(
        labelText: showLabel ? label : null,
        labelStyle: const TextStyle(color: Color(0xFF68616B)),
        prefixIcon: showLabel ? Icon(icon, size: 18) : null,
        prefixIconColor: const Color(0xFF68616B),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(11),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _loginFieldRow({
    required Key key,
    required TextEditingController controller,
    required String label,
    bool obscureText = false,
  }) {
    return Row(
      children: [
        SizedBox(
          width: 92,
          child: Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: _ink,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: _loginTextField(
            key: key,
            controller: controller,
            label: label,
            icon: Icons.circle,
            obscureText: obscureText,
            showLabel: false,
          ),
        ),
      ],
    );
  }

  Widget _loginRoleButton(UserRole role, IconData icon) {
    final selected = _loginRole == role;
    return OutlinedButton.icon(
      key: ValueKey('role-${role.name}'),
      onPressed: () => setState(() => _loginRole = role),
      icon: Icon(icon, size: 17),
      label: Text(role == UserRole.admin ? 'Admin' : 'Barista'),
      style: OutlinedButton.styleFrom(
        foregroundColor: selected ? Colors.white : const Color(0xFFD8CCD7),
        backgroundColor: selected ? _plum : _surface,
        side: BorderSide(
          color: selected ? _plum : _line,
        ),
        padding: const EdgeInsets.symmetric(vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _login() {
    if (_usernameController.text.trim().isEmpty ||
        _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Enter a username and password to continue.')),
      );
      return;
    }
    setState(() {
      _role = _loginRole;
      _sessionScreen = null;
      _section = CafeSection.overview;
    });
  }

  Widget _shiftSummaryPage(bool compact) {
    return Scaffold(
      backgroundColor: _paper,
      body: _VoodooBackdrop(
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1000),
              child: CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      compact ? 17 : 30,
                      22,
                      compact ? 17 : 30,
                      28,
                    ),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        Row(
                          children: [
                            const Icon(Icons.coffee_rounded,
                                color: _plum, size: 25),
                            const SizedBox(width: 9),
                            const Expanded(
                              child: Text(
                                'VOODOO CAFE',
                                style: TextStyle(
                                  color: _ink,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              key: const ValueKey('return-to-login'),
                              onPressed: _returnToLogin,
                              icon: const Icon(Icons.login_rounded, size: 16),
                              label: const Text('Back to login'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _pageHeading(
                          'Shift summary',
                          'Your shift has ended. Review the sales and orders before signing in again.',
                        ),
                        const SizedBox(height: 7),
                        Text(
                          'Morning shift · 7:00 AM – 12:00 PM · $_staffName',
                          style: const TextStyle(color: _muted, fontSize: 11),
                        ),
                        const SizedBox(height: 20),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final columns = constraints.maxWidth < 560 ? 1 : 3;
                            final gap = 12.0;
                            final width =
                                (constraints.maxWidth - gap * (columns - 1)) /
                                    columns;
                            return Wrap(
                              spacing: gap,
                              runSpacing: gap,
                              children: [
                                _closeoutStat(
                                  'Shift sales',
                                  '\$${_shiftSales.toStringAsFixed(2)}',
                                  Icons.payments_outlined,
                                  width,
                                ),
                                _closeoutStat(
                                  'Orders',
                                  '$_ordersToday',
                                  Icons.receipt_long_outlined,
                                  width,
                                ),
                                _closeoutStat(
                                  'Average order',
                                  '\$${(_ordersToday == 0 ? 0 : _shiftSales / _ordersToday).toStringAsFixed(2)}',
                                  Icons.show_chart_rounded,
                                  width,
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 20),
                        _panel(
                          title: 'Orders in this shift',
                          subtitle:
                              '${_orders.length} order details · Sales total \$${_shiftSales.toStringAsFixed(2)}',
                          child: Column(
                            children: [
                              const SizedBox(height: 9),
                              ..._orders.map(
                                  (order) => _closeoutOrder(order, compact)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Shift totals are a demo summary. No payment or inventory data is sent to a server.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: _muted, fontSize: 10),
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _closeoutStat(
      String label, String value, IconData icon, double width) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(17),
        decoration: _cardDecoration(),
        child: Row(
          children: [
            Icon(icon, color: _plum, size: 21),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(color: _muted, fontSize: 10)),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _closeoutOrder(CafeOrder order, bool compact) {
    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFEFE7ED),
              borderRadius: BorderRadius.circular(10),
            ),
            child:
                const Icon(Icons.receipt_long_outlined, color: _plum, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      order.number,
                      style: const TextStyle(
                        color: _ink,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(width: 8),
                    _statusPill(order.status),
                    if (!compact) ...[
                      const SizedBox(width: 8),
                      Text(order.customer,
                          style: const TextStyle(color: _muted, fontSize: 10)),
                    ],
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  order.items,
                  style: const TextStyle(color: _muted, fontSize: 10),
                ),
                if (compact) ...[
                  const SizedBox(height: 3),
                  Text(order.time,
                      style: const TextStyle(color: _muted, fontSize: 9)),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${order.total.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: _ink,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (!compact)
                Text(order.time,
                    style: const TextStyle(color: _muted, fontSize: 9)),
            ],
          ),
        ],
      ),
    );
  }

  void _logout() {
    setState(() {
      _cart.clear();
      _sessionScreen = _SessionScreen.shiftSummary;
    });
  }

  void _returnToLogin() {
    setState(() {
      _sessionScreen = _SessionScreen.login;
      _loginRole = _role;
      _usernameController.clear();
      _passwordController.clear();
    });
  }

  Widget _buildSidebar() {
    return Container(
      width: 242,
      padding: const EdgeInsets.fromLTRB(18, 24, 14, 16),
      decoration: const BoxDecoration(
        color: _surface,
        border: Border(right: BorderSide(color: _line)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: _plum,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(
                    Icons.coffee_rounded,
                    color: Colors.white,
                    size: 23,
                  ),
                ),
                const SizedBox(width: 11),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'VOODOO',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.8, 
                        color: _ink,
                      ),
                    ),
                    Text(
                      'CAFE MANAGEMENT',
                      style: TextStyle(
                        fontSize: 9,
                        letterSpacing: 1.15,
                        color: _muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 34),
            const Padding(
              padding: EdgeInsets.only(left: 12, bottom: 10),
              child: Text(
                'MAIN MENU',
                style: TextStyle(
                  color: _muted,
                  fontSize: 10,
                  letterSpacing: 1.15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            ..._sections.map((section) => _navItem(section)),
            const SizedBox(height: 22),
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: _surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.schedule_rounded, size: 17, color: _green),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Morning shift',
                      style: TextStyle(
                        color: _ink,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: _green,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 13),
            _roleSwitcher(),
          ],
        ),
      ),
    );
  }

  Widget _navItem(CafeSection section) {
    final selected = section == _section;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        key: ValueKey('section-${section.name}'),
        borderRadius: BorderRadius.circular(11),
        onTap: () => setState(() => _section = section),
        child: Container(
          height: 43,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: selected ? const Color(0xFFE7E3E7) : Colors.transparent,
            borderRadius: BorderRadius.circular(2),
          ),
          child: Row(
            children: [
              Icon(
                _sectionIcon(section),
                size: 19,
                color: selected ? _plum : _muted,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _sectionLabel(section),
                  style: TextStyle(
                    color: selected ? _paper : _muted,
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
              if (section == CafeSection.restocks && _pendingRequests > 0)
                _countBadge(_pendingRequests),
            ],
          ),
        ),
      ),
    );
  }

  Widget _roleSwitcher() {
    return InkWell(
      onTap: _showRoleMenu,
      borderRadius: BorderRadius.circular(13),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
        decoration: BoxDecoration(
          border: Border.all(color: _line),
          borderRadius: BorderRadius.circular(13),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: _role == UserRole.admin
                  ? const Color(0xFFF0E8DC)
                  : const Color(0xFFE5EDE7),
              child: Icon(
                _role == UserRole.admin
                    ? Icons.person_outline_rounded
                    : Icons.local_cafe_outlined,
                size: 17,
                color: _role == UserRole.admin ? _amber : _green,
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _role == UserRole.admin ? 'Taylor Brooks' : 'Mia Chen',
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    _roleName,
                    style: const TextStyle(color: _muted, fontSize: 10),
                  ),
                ],
              ),
            ),
            const Icon(Icons.unfold_more_rounded, size: 17, color: _muted),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar(bool compact) {
    return Container(
      height: 70,
      padding: EdgeInsets.symmetric(horizontal: compact ? 17 : 30),
      decoration: const BoxDecoration(
        color: _surface,
        border: Border(bottom: BorderSide(color: _line)),
      ),
      child: Row(
        children: [
          if (compact) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: _plum,
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Icon(
                Icons.coffee_rounded,
                color: _surface,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Text(
              _sectionLabel(_section),
              style: const TextStyle(
                color: _ink,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
          ),
          if (!compact)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
              decoration: BoxDecoration(
                color: _paper,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.calendar_today_outlined, size: 14, color: _muted),
                  SizedBox(width: 8),
                  Text(
                    'Today, Nov 11',
                    style: TextStyle(color: _muted, fontSize: 11),
                  ),
                  SizedBox(width: 5),
                  Icon(Icons.keyboard_arrow_down, size: 15, color: _muted),
                ],
              ),
            ),
          const SizedBox(width: 12),
          if (compact)
            IconButton(
              key: const ValueKey('profile-menu'),
              tooltip: 'Profile and roles',
              onPressed: _showRoleMenu,
              icon: CircleAvatar(
                radius: 16,
                backgroundColor: _role == UserRole.admin
                    ? const Color(0xFFF0E8DC)
                    : const Color(0xFFE5EDE7),
                child: Icon(
                  _role == UserRole.admin
                      ? Icons.person_outline_rounded
                      : Icons.local_cafe_outlined,
                  size: 17,
                  color: _role == UserRole.admin ? _amber : _green,
                ),
              ),
            )
          else
            IconButton(
              tooltip: 'Notifications',
              onPressed: () => setState(() => _section = CafeSection.restocks),
              icon: Badge(
                isLabelVisible: _pendingRequests > 0,
                smallSize: 7,
                child: const Icon(
                  Icons.notifications_none_rounded,
                  color: _muted,
                  size: 21,
                ),
              ),
            ),
          IconButton(
            key: const ValueKey('logout-button'),
            tooltip: 'Log out',
            onPressed: _logout,
            icon: const Icon(Icons.logout_rounded, color: _muted, size: 20),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation() {
    final visible = _sections;
    return Container(
      decoration: const BoxDecoration(
        color: _surface,
        border: Border(top: BorderSide(color: _line)),
      ),
      child: NavigationBar(
        height: 66,
        selectedIndex: visible.indexOf(_section).clamp(0, visible.length - 1),
        backgroundColor: _paper,
        indicatorColor: _plum.withValues(alpha: 0.35),
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
        onDestinationSelected: (index) =>
            setState(() => _section = visible[index]),
        destinations: visible.map((section) {
          return NavigationDestination(
            key: ValueKey('section-${section.name}'),
            icon: Icon(_sectionIcon(section), size: 20),
            label: _compactSectionLabel(section),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPageContent(bool compact) {
    final horizontal = compact ? 17.0 : 30.0;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(horizontal, 26, horizontal, 32),
      child: switch (_section) {
        CafeSection.overview => _overviewPage(compact),
        CafeSection.pos => _posPage(compact),
        CafeSection.orders => _ordersPage(compact),
        CafeSection.inventory => _inventoryPage(compact),
        CafeSection.restocks => _restocksPage(compact),
        CafeSection.analytics => _analyticsPage(compact),
      },
    );
  }

  Widget _overviewPage(bool compact) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _pageHeading(
          'Good morning, ${_role == UserRole.admin ? 'Taylor' : 'Mia'} ☀️',
          'Here’s what’s happening at Voodoo Cafe today.',
          trailing: _actionButton(
            'New order',
            Icons.add_rounded,
            () => setState(() => _section = CafeSection.pos),
          ),
        ),
        const SizedBox(height: 22),
        _statGrid(compact),
        const SizedBox(height: 16),
        _dashboardReferenceCards(),
        const SizedBox(height: 22),
        _salesMixCard(compact),
        const SizedBox(height: 18),
        if (compact) ...[
          _shiftCard(),
          const SizedBox(height: 16),
          _recentOrdersCard(),
          const SizedBox(height: 16),
          _restockSummaryCard(),
        ] else
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 3, child: _shiftCard()),
              const SizedBox(width: 18),
              Expanded(flex: 2, child: _restockSummaryCard()),
            ],
          ),
        if (!compact) ...[const SizedBox(height: 18), _recentOrdersCard()],
      ],
    );
  }

  Widget _dashboardReferenceCards() {
    final cards = [
      _referenceMetricCard(
        'TOTAL SALES',
        '\$${_shiftSales.toStringAsFixed(2)}',
        Icons.payments_outlined,
        _green,
      ),
      _referenceMetricCard(
        'PURCHASE ORDERS',
        '$_pendingRequests pending',
        Icons.shopping_bag_outlined,
        _amber,
      ),
      _referenceBestSellers(),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth < 460
            ? 1
            : constraints.maxWidth < 900
                ? 2
                : 3;
        const gap = 12.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children:
              cards.map((card) => SizedBox(width: width, child: card)).toList(),
        );
      },
    );
  }

  Widget _referenceMetricCard(
    String label,
    String value,
    IconData icon,
    Color accent,
  ) {
    return Container(
      height: 118,
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 9,
                    letterSpacing: 0.8,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Icon(icon, size: 18, color: accent),
            ],
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: _ink,
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          Container(height: 2, color: accent.withValues(alpha: 0.8)),
        ],
      ),
    );
  }

  Widget _referenceBestSellers() {
    final bestSellers = _products.take(3).toList();
    return Container(
      height: 118,
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'BEST SELLING PRODUCTS',
            style: TextStyle(
              color: _muted,
              fontSize: 9,
              letterSpacing: 0.8,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 7),
          ...bestSellers.map(
            (product) => Expanded(
              child: Row(
                children: [
                  Text(product.emoji, style: const TextStyle(fontSize: 13)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      product.name,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: _ink, fontSize: 10),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _salesMixCard(bool compact) {
    return _panel(
      title: "Today's product sales",
      subtitle: 'Sales mix by menu category',
      child: Padding(
        padding: const EdgeInsets.only(top: 14),
        child: compact
            ? Row(
                children: [
                  const SizedBox(
                    width: 124,
                    height: 124,
                    child: CustomPaint(painter: _SalesRingPainter()),
                  ),
                  const SizedBox(width: 17),
                  Expanded(child: _salesMixLegend()),
                ],
              )
            : SizedBox(
                height: 170,
                child: Row(
                  children: [
                    const Expanded(
                      child: Center(
                        child: SizedBox(
                          width: 150,
                          height: 150,
                          child: CustomPaint(painter: _SalesRingPainter()),
                        ),
                      ),
                    ),
                    Expanded(child: _salesMixLegend()),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _salesMixLegend() {
    const categories = [
      ('Signature coffee', 44, Color(0xFF80E08E)),
      ("Barista's pick", 31, Color(0xFF75B9F2)),
      ('Non-coffee', 25, Color(0xFFB88BE8)),
    ];
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: categories
          .map(
            (category) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 7),
              child: Row(
                children: [
                  Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: category.$3,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      category.$1,
                      style: const TextStyle(color: _muted, fontSize: 10),
                    ),
                  ),
                  Text(
                    '${category.$2}%',
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _statGrid(bool compact) {
    final stats = [
      _StatData(
        'Shift sales',
        '\$${_shiftSales.toStringAsFixed(2)}',
        '+12.8%',
        Icons.payments_outlined,
        _green,
      ),
      _StatData(
        'Orders today',
        '$_ordersToday',
        '+8.2%',
        Icons.receipt_long_outlined,
        _plum,
      ),
      _StatData(
        'Avg. order',
        '\$${(_shiftSales / (_ordersToday == 0 ? 1 : _ordersToday)).toStringAsFixed(2)}',
        '+3.4%',
        Icons.show_chart_rounded,
        _amber,
      ),
      _StatData(
        'Need attention',
        '${_lowStockCount + _pendingRequests}',
        'Inventory',
        Icons.inventory_2_outlined,
        const Color(0xFFB65C45),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = compact || constraints.maxWidth < 880 ? 2 : 4;
        final gap = 12.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: stats
              .map((stat) => SizedBox(width: width, child: _statCard(stat)))
              .toList(),
        );
      },
    );
  }

  Widget _statCard(_StatData stat) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  stat.label,
                  style: const TextStyle(color: _muted, fontSize: 11),
                ),
              ),
              Container(
                width: 31,
                height: 31,
                decoration: BoxDecoration(
                  color: stat.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(stat.icon, color: stat.color, size: 17),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            stat.value,
            style: const TextStyle(
              color: _ink,
              fontSize: 22,
              height: 1,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.6,
            ),
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              if (stat.label != 'Need attention')
                const Icon(Icons.trending_up, size: 13, color: _green),
              if (stat.label != 'Need attention') const SizedBox(width: 3),
              Text(
                stat.change,
                style: TextStyle(
                  color: stat.label == 'Need attention' ? _amber : _green,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _shiftCard() {
    final shifts = [
      (
        'Morning',
        '7:00 AM – 12:00 PM',
        0.78,
        '\$${_shiftSales.toStringAsFixed(2)}',
        'On track'
      ),
      ('Afternoon', '12:00 PM – 5:00 PM', 0.42, '\$424.00', 'In progress'),
      ('Evening', '5:00 PM – 9:00 PM', 0.0, '—', 'Upcoming'),
    ];
    return _panel(
      title: 'Shift performance',
      subtitle: 'Sales by shift · Tuesday, Nov 11',
      trailing: TextButton(
        onPressed: () => setState(() => _section = CafeSection.analytics),
        child: const Text('View report', style: TextStyle(color: _plum)),
      ),
      child: Column(
        children: shifts.map((shift) {
          final isActive = shift.$5 == 'In progress';
          return Padding(
            padding: const EdgeInsets.only(top: 15),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: isActive
                        ? const Color(0xFFE8F1EB)
                        : const Color(0xFFF4F1EC),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isActive ? Icons.wb_sunny_outlined : Icons.schedule_rounded,
                    size: 17,
                    color: isActive ? _green : _muted,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        shift.$1,
                        style: const TextStyle(
                          color: _ink,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        shift.$2,
                        style: const TextStyle(color: _muted, fontSize: 10),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: shift.$3,
                      minHeight: 6,
                      backgroundColor: _line,
                      color: isActive ? _plum : const Color(0xFFC9B9C4),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                SizedBox(
                  width: 74,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        shift.$4,
                        style: const TextStyle(
                          color: _ink,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        shift.$5,
                        style: TextStyle(
                          color: isActive ? _green : _muted,
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _recentOrdersCard() {
    return _panel(
      title: 'Recent orders',
      subtitle: 'Latest activity from today',
      trailing: TextButton(
        onPressed: () => setState(() => _section = CafeSection.orders),
        child: const Text('All orders', style: TextStyle(color: _plum)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 8),
          _tableHeader(['ORDER', 'CUSTOMER', 'ITEMS', 'TOTAL', 'STATUS']),
          const Divider(height: 20, color: _line),
          ..._orders.take(4).map((order) => _orderRow(order)),
        ],
      ),
    );
  }

  Widget _restockSummaryCard() {
    final pending = _requests.where((request) => request.status == 'Pending');
    return _panel(
      title: _role == UserRole.admin ? 'Restock approvals' : 'Stock alerts',
      subtitle: _role == UserRole.admin
          ? 'Requests waiting for your review'
          : 'Items running low today',
      trailing: _countBadge(
        _role == UserRole.admin ? _pendingRequests : _lowStockCount,
      ),
      child: Column(
        children: [
          const SizedBox(height: 7),
          if (_role == UserRole.admin && pending.isNotEmpty)
            ...pending.take(3).map((request) => _requestSummaryRow(request))
          else
            ..._products
                .where((product) => product.stock <= 5)
                .take(3)
                .map((product) => _stockAlertRow(product)),
          const SizedBox(height: 9),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => setState(() => _section = CafeSection.restocks),
              style: OutlinedButton.styleFrom(
                foregroundColor: _plum,
                side: const BorderSide(color: _line),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: Text(
                _role == UserRole.admin ? 'Review requests' : 'View inventory',
                style: const TextStyle(fontSize: 11),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _requestSummaryRow(RestockRequest request) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          _productIcon(request.product, size: 34),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  request.product.name,
                  style: const TextStyle(
                    color: _ink,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  '${request.quantity} ${request.product.unit} · ${request.requestedBy}',
                  style: const TextStyle(color: _muted, fontSize: 9),
                ),
              ],
            ),
          ),
          Text(
            request.time,
            style: const TextStyle(color: _muted, fontSize: 9),
          ),
        ],
      ),
    );
  }

  Widget _stockAlertRow(Product product) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          _productIcon(product, size: 34),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              product.name,
              style: const TextStyle(
                color: _ink,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            '${product.stock} left',
            style: const TextStyle(
              color: _amber,
              fontSize: 10,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _ordersPage(bool compact) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _pageHeading(
          'Orders',
          _role == UserRole.admin
              ? 'Track and review every order from today.'
              : 'Your live queue. Tap an order to move it along.',
          trailing: _actionButton(
            'New order',
            Icons.add_rounded,
            () => setState(() => _section = CafeSection.pos),
          ),
        ),
        const SizedBox(height: 19),
        _filterBar(
          ['All orders', 'New', 'Preparing', 'Ready', 'Completed'],
          onSelected: (filter) => setState(() => _orderFilter = filter),
        ),
        const SizedBox(height: 15),
        ..._orders
            .where((order) =>
                _orderFilter == 'All orders' || order.status == _orderFilter)
            .map((order) => _orderCard(order, compact)),
      ],
    );
  }

  Widget _orderCard(CafeOrder order, bool compact) {
    return Container(
      margin: const EdgeInsets.only(bottom: 11),
      padding: EdgeInsets.all(compact ? 14 : 17),
      decoration: _cardDecoration(),
      child: Column(
        children: [
          Row(
            children: [
              Text(
                order.number,
                style: const TextStyle(
                  color: _ink,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 9),
              _statusPill(order.status),
              const Spacer(),
              Text(
                order.time,
                style: const TextStyle(color: _muted, fontSize: 10),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: _plum.withValues(alpha: 0.18),
                child: const Icon(Icons.person_outline, color: _plum, size: 18),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.customer,
                      style: const TextStyle(
                        color: _ink,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      order.items,
                      style: const TextStyle(color: _muted, fontSize: 10),
                    ),
                  ],
                ),
              ),
              Text(
                '\$${order.total.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: _ink,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          if (_role == UserRole.barista && order.status != 'Completed') ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: _actionButton(
                _nextOrderAction(order.status),
                Icons.arrow_forward_rounded,
                () => _advanceOrder(order),
                compact: true,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _inventoryPage(bool compact) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _pageHeading(
          'Inventory',
          _role == UserRole.admin
              ? 'Keep track of ingredients and cafe supplies.'
              : 'Check stock levels and request what you need.',
          trailing: _role == UserRole.barista
              ? _actionButton(
                  'Request stock',
                  Icons.add_rounded,
                  _showRestockDialog,
                )
              : null,
        ),
        const SizedBox(height: 19),
        _statGrid(compact),
        const SizedBox(height: 18),
        _panel(
          title: 'Menu & stock levels',
          subtitle: '${_products.length} active items · Updated just now',
          child: Column(
            children: [
              const SizedBox(height: 8),
              _tableHeader(
                compact
                    ? ['ID', 'PRODUCT', 'QTY', 'STATUS']
                    : ['ID', 'PRODUCT', 'TYPE', 'QUANTITY', 'STATUS'],
              ),
              const Divider(height: 20, color: _line),
              ..._products.map((product) => _inventoryRow(product, compact)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _inventoryRow(Product product, bool compact) {
    final low = product.stock <= 5;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 5),
      decoration: BoxDecoration(
        color: int.parse(product.id) % 2 == 1
            ? Colors.white.withValues(alpha: 0.1)
            : Colors.transparent,
      ),
      child: Row(
        children: [
          if (!compact)
            Expanded(
              flex: 1,
              child: Text(
                product.id,
                style: const TextStyle(color: _muted, fontSize: 9),
              ),
            ),
          Expanded(
            flex: compact ? 4 : 4,
            child: Row(
              children: [
                _productIcon(product, size: 34),
                const SizedBox(width: 9),
                Flexible(
                  child: Text(
                    product.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (!compact)
            Expanded(
              flex: 3,
              child: Text(
                product.category,
                style: const TextStyle(color: _muted, fontSize: 10),
              ),
            ),
          Expanded(
            flex: 2,
            child: Text(
              compact ? '${product.stock}' : '${product.stock} ${product.unit}',
              style: TextStyle(
                color: low ? _amber : _ink,
                fontSize: 10,
                fontWeight: low ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
          Expanded(child: _statusPill(low ? 'Low stock' : 'In stock')),
          if (_role == UserRole.barista && low && !compact)
            IconButton(
              tooltip: 'Request restock',
              onPressed: () => _showRestockDialog(product: product),
              icon: const Icon(
                Icons.add_circle_outline,
                color: _plum,
                size: 18,
              ),
            ),
        ],
      ),
    );
  }

  Widget _restocksPage(bool compact) {
    final requests = _role == UserRole.admin
        ? _requests
        : _requests.where((request) => request.requestedBy == 'Mia Chen');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _pageHeading(
          _role == UserRole.admin ? 'Restock requests' : 'My stock requests',
          _role == UserRole.admin
              ? 'Review barista requests and keep the shelves ready.'
              : 'Send a request to your admin when supplies run low.',
          trailing: _role == UserRole.barista
              ? _actionButton(
                  'New request',
                  Icons.add_rounded,
                  _showRestockDialog,
                )
              : null,
        ),
        const SizedBox(height: 18),
        if (_role == UserRole.admin)
          _statGrid(compact)
        else
          _panel(
            title: 'Requesting stock',
            subtitle: 'Requests go to your admin for approval.',
            child: SizedBox(
              width: double.infinity,
              child: _actionButton(
                'Create restock request',
                Icons.add_rounded,
                _showRestockDialog,
              ),
            ),
          ),
        const SizedBox(height: 18),
        _panel(
          title: _role == UserRole.admin ? 'All requests' : 'Request history',
          subtitle: '${requests.length} requests',
          child: Column(
            children: [
              const SizedBox(height: 8),
              _tableHeader([
                'ITEM',
                'QUANTITY',
                'REQUESTED BY',
                'TIME',
                'STATUS',
                if (_role == UserRole.admin) 'ACTION',
              ]),
              const Divider(height: 20, color: _line),
              ...requests.map((request) => _restockRow(request, compact)),
              if (requests.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(25),
                  child: Text(
                    'No requests yet. You’re all stocked up.',
                    style: TextStyle(color: _muted, fontSize: 12),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _restockRow(RestockRequest request, bool compact) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Row(
              children: [
                _productIcon(request.product, size: 32),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    request.product.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _ink,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Text(
              '${request.quantity} ${request.product.unit}',
              style: const TextStyle(color: _ink, fontSize: 10),
            ),
          ),
          if (!compact)
            Expanded(
              child: Text(
                request.requestedBy,
                style: const TextStyle(color: _muted, fontSize: 10),
              ),
            ),
          if (!compact)
            Expanded(
              child: Text(
                request.time,
                style: const TextStyle(color: _muted, fontSize: 10),
              ),
            ),
          Expanded(child: _statusPill(request.status)),
          if (_role == UserRole.admin && request.status == 'Pending')
            Expanded(
              child: compact
                  ? PopupMenuButton<bool>(
                      tooltip: 'Review restock request',
                      onSelected: (approved) =>
                          _resolveRequest(request, approved),
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: true, child: Text('Approve')),
                        PopupMenuItem(value: false, child: Text('Reject')),
                      ],
                    )
                  : Row(
                      children: [
                        IconButton(
                          tooltip: 'Approve request',
                          onPressed: () => _resolveRequest(request, true),
                          icon: const Icon(
                            Icons.check_circle_outline,
                            color: _green,
                            size: 19,
                          ),
                          visualDensity: VisualDensity.compact,
                        ),
                        IconButton(
                          tooltip: 'Reject request',
                          onPressed: () => _resolveRequest(request, false),
                          icon: const Icon(
                            Icons.cancel_outlined,
                            color: Color(0xFFB65C45),
                            size: 19,
                          ),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
            ),
        ],
      ),
    );
  }

  Widget _analyticsPage(bool compact) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _pageHeading(
          'Sales & shifts',
          'A clear view of how each shift is performing.',
        ),
        const SizedBox(height: 20),
        _statGrid(compact),
        const SizedBox(height: 18),
        _shiftCard(),
        const SizedBox(height: 18),
        _recentOrdersCard(),
      ],
    );
  }

  Widget _posPage(bool compact) {
    final categories = ['All', 'Coffee', 'Tea', 'Bakery'];
    final products = _products
        .where((product) => _category == 'All' || product.category == _category)
        .toList();
    final cartTotal = _cart.entries.fold<double>(
      0,
      (total, entry) => total + _productByName(entry.key).price * entry.value,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _pageHeading(
          'Point of sale',
          'Tap an item to add it to the current order.',
        ),
        const SizedBox(height: 17),
        _filterBar(
          categories,
          onSelected: (category) => setState(() => _category = category),
        ),
        const SizedBox(height: 16),
        if (compact) ...[
          _cartPanel(cartTotal),
          const SizedBox(height: 15),
          _productGrid(products, compact),
        ] else
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 3, child: _productGrid(products, compact)),
              const SizedBox(width: 17),
              Expanded(flex: 2, child: _cartPanel(cartTotal)),
            ],
          ),
      ],
    );
  }

  Widget _productGrid(List<Product> products, bool compact) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = compact ? 2 : (constraints.maxWidth > 640 ? 3 : 2);
        const gap = 11.0;
        final width = (constraints.maxWidth - gap * (columns - 1)) / columns;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: products
              .map(
                (product) => SizedBox(
                  width: width,
                  child: InkWell(
                    onTap: () => setState(() {
                      _cart[product.name] = (_cart[product.name] ?? 0) + 1;
                    }),
                    borderRadius: BorderRadius.circular(15),
                    child: Container(
                      padding: const EdgeInsets.all(13),
                      decoration: _cardDecoration(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 76,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: product.color,
                              borderRadius: BorderRadius.circular(11),
                            ),
                            child: Center(
                              child: Text(
                                product.emoji,
                                style: const TextStyle(fontSize: 33),
                              ),
                            ),
                          ),
                          const SizedBox(height: 11),
                          Text(
                            product.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: _ink,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '\$${product.price.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    color: _plum,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              Text(
                                '${product.stock} left',
                                style: TextStyle(
                                  color: product.stock <= 5 ? _amber : _muted,
                                  fontSize: 9,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        );
      },
    );
  }

  Widget _cartPanel(double total) {
    return _panel(
      title: 'Current order',
      subtitle: _cart.isEmpty ? 'No items added yet' : '${_cart.length} items',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_cart.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.shopping_bag_outlined, color: _muted, size: 29),
                    SizedBox(height: 8),
                    Text(
                      'Your order is empty',
                      style: TextStyle(color: _muted, fontSize: 11),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._cart.entries.map((entry) {
              final product = _productByName(entry.key);
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 9),
                child: Row(
                  children: [
                    _productIcon(product, size: 34),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.name,
                            style: const TextStyle(
                              color: _ink,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            '\$${product.price.toStringAsFixed(2)} each',
                            style: const TextStyle(color: _muted, fontSize: 9),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => _changeCartQuantity(entry.key, -1),
                      icon: const Icon(Icons.remove_circle_outline, size: 17),
                      color: _muted,
                      visualDensity: VisualDensity.compact,
                    ),
                    Text(
                      '${entry.value}',
                      style: const TextStyle(color: _ink, fontSize: 11),
                    ),
                    IconButton(
                      onPressed: () => _changeCartQuantity(entry.key, 1),
                      icon: const Icon(Icons.add_circle_outline, size: 17),
                      color: _plum,
                      visualDensity: VisualDensity.compact,
                    ),
                  ],
                ),
              );
            }),
          const Divider(height: 21, color: _line),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Total',
                  style: TextStyle(
                    color: _ink,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: const TextStyle(
                  color: _ink,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _cart.isEmpty ? null : _checkout,
              icon: const Icon(Icons.check_rounded, size: 17),
              label: const Text('Complete sale'),
              style: FilledButton.styleFrom(
                backgroundColor: _plum,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(11),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _pageHeading(String title, String subtitle, {Widget? trailing}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: _ink,
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                subtitle,
                style: const TextStyle(color: _muted, fontSize: 11),
              ),
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: 8), trailing],
      ],
    );
  }

  Widget _panel({
    required String title,
    required String subtitle,
    required Widget child,
    Widget? trailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: _ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(color: _muted, fontSize: 10),
                    ),
                  ],
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          child,
        ],
      ),
    );
  }

  Widget _tableHeader(List<String> labels) {
    return Row(
      children: labels.map((label) {
        return Expanded(
          flex: switch (label) {
            'ITEM' || 'ORDER' || 'PRODUCT' => 3,
            'ID' => 1,
            _ => 2,
          },
          child: Text(
            label,
            style: const TextStyle(
              color: _muted,
              fontSize: 8,
              letterSpacing: 0.7,
              fontWeight: FontWeight.w700,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _orderRow(CafeOrder order) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              order.number,
              style: const TextStyle(
                color: _ink,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              order.customer,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: _ink, fontSize: 10),
            ),
          ),
          Expanded(
            flex: 5,
            child: Text(
              order.items,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: _muted, fontSize: 9),
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              '\$${order.total.toStringAsFixed(2)}',
              style: const TextStyle(
                color: _ink,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(flex: 2, child: _statusPill(order.status)),
        ],
      ),
    );
  }

  Widget _filterBar(
    List<String> options, {
    required ValueChanged<String> onSelected,
  }) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: options.map((option) {
          final selected =
              (_section == CafeSection.pos ? _category : _orderFilter) ==
                  option;
          return Padding(
            padding: const EdgeInsets.only(right: 7),
            child: InkWell(
              onTap: () => onSelected(option),
              borderRadius: BorderRadius.circular(9),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: selected ? _plum : _surface,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: selected ? _plum : _line),
                ),
                child: Text(
                  option,
                  style: TextStyle(
                    color: selected ? Colors.white : _muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _actionButton(
    String label,
    IconData icon,
    VoidCallback onPressed, {
    bool compact = false,
  }) {
    return FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: compact ? 14 : 17),
      label: Text(label, style: TextStyle(fontSize: compact ? 10 : 11)),
      style: FilledButton.styleFrom(
        backgroundColor: _plum,
        foregroundColor: Colors.white,
        padding: EdgeInsets.symmetric(
          horizontal: compact ? 12 : 14,
          vertical: compact ? 8 : 11,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _statusPill(String status) {
    final color = switch (status) {
      'New' || 'Pending' => _amber,
      'Preparing' => _plum,
      'Ready' || 'Approved' || 'In stock' => _green,
      'Completed' => _muted,
      'Low stock' || 'Rejected' => const Color(0xFFB65C45),
      _ => _muted,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: color,
          fontSize: 8,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _productIcon(Product product, {double size = 38}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: product.color,
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      child: Center(
        child: Text(product.emoji, style: TextStyle(fontSize: size * 0.48)),
      ),
    );
  }

  Widget _countBadge(int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF4E8D5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          color: _amber,
          fontSize: 9,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: _surface,
      borderRadius: BorderRadius.circular(3),
      border: Border.all(color: _line),
    );
  }

  int get _pendingRequests =>
      _requests.where((request) => request.status == 'Pending').length;

  int get _lowStockCount =>
      _products.where((product) => product.stock <= 5).length;

  IconData _sectionIcon(CafeSection section) => switch (section) {
        CafeSection.overview => Icons.grid_view_rounded,
        CafeSection.pos => Icons.point_of_sale_rounded,
        CafeSection.orders => Icons.receipt_long_outlined,
        CafeSection.inventory => Icons.inventory_2_outlined,
        CafeSection.restocks => Icons.local_shipping_outlined,
        CafeSection.analytics => Icons.bar_chart_rounded,
      };

  String _sectionLabel(CafeSection section) => switch (section) {
        CafeSection.overview => 'Dashboard',
        CafeSection.pos => 'Point of sale',
        CafeSection.orders => 'Orders',
        CafeSection.inventory => 'Inventory',
        CafeSection.restocks => 'Restock requests',
        CafeSection.analytics => 'Report',
      };

  String _compactSectionLabel(CafeSection section) => switch (section) {
        CafeSection.pos => 'POS',
        CafeSection.inventory => 'Stock',
        CafeSection.restocks => 'Restocks',
        CafeSection.analytics => 'Sales',
        _ => _sectionLabel(section),
      };

  Product _productByName(String name) =>
      _products.firstWhere((product) => product.name == name);

  void _changeCartQuantity(String name, int delta) {
    setState(() {
      final next = (_cart[name] ?? 0) + delta;
      if (next <= 0) {
        _cart.remove(name);
      } else {
        _cart[name] = next;
      }
    });
  }

  void _checkout() {
    final unavailable = _cart.entries.where(
      (entry) => _productByName(entry.key).stock < entry.value,
    );
    if (unavailable.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Not enough stock for ${unavailable.first.key}. Adjust the order to continue.',
          ),
        ),
      );
      return;
    }
    final total = _cart.entries.fold<double>(
      0,
      (sum, entry) => sum + _productByName(entry.key).price * entry.value,
    );
    final items = _cart.entries
        .map((entry) => '${entry.value} × ${entry.key}')
        .join(', ');
    setState(() {
      for (final entry in _cart.entries) {
        _productByName(entry.key).stock -= entry.value;
      }
      _orders.insert(
        0,
        CafeOrder(
          number: '#${_nextOrderNumber++}',
          customer: 'Walk-in',
          items: items,
          total: total,
          time: TimeOfDay.now().format(context),
        ),
      );
      _shiftSales += total;
      _ordersToday++;
      _cart.clear();
      _section = CafeSection.orders;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sale complete. Stock levels updated.')),
    );
  }

  String _nextOrderAction(String status) => switch (status) {
        'New' => 'Start preparing',
        'Preparing' => 'Mark ready',
        'Ready' => 'Complete order',
        _ => 'Update order',
      };

  void _advanceOrder(CafeOrder order) {
    setState(() {
      order.status = switch (order.status) {
        'New' => 'Preparing',
        'Preparing' => 'Ready',
        'Ready' => 'Completed',
        _ => order.status,
      };
    });
  }

  void _resolveRequest(RestockRequest request, bool approved) {
    setState(() {
      request.status = approved ? 'Approved' : 'Rejected';
      if (approved) request.product.stock += request.quantity;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          approved
              ? '${request.quantity} ${request.product.unit} of ${request.product.name} added to inventory.'
              : 'Restock request for ${request.product.name} rejected.',
        ),
      ),
    );
  }

  Future<void> _showRestockDialog({Product? product}) async {
    Product selectedProduct = product ?? _products.first;
    final quantityController = TextEditingController(text: '10');
    final request = await showDialog<RestockRequest>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Request a restock'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Choose an item and the quantity your team needs.',
                style: TextStyle(color: _muted, fontSize: 12),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<Product>(
                initialValue: selectedProduct,
                decoration: const InputDecoration(
                  labelText: 'Inventory item',
                  border: OutlineInputBorder(),
                ),
                items: _products
                    .map(
                      (item) =>
                          DropdownMenuItem(value: item, child: Text(item.name)),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setDialogState(() => selectedProduct = value);
                  }
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: quantityController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Quantity',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                final parsedQuantity =
                    int.tryParse(quantityController.text) ?? 0;
                if (parsedQuantity <= 0) return;
                Navigator.pop(
                  context,
                  RestockRequest(
                    product: selectedProduct,
                    quantity: parsedQuantity,
                    requestedBy:
                        _role == UserRole.admin ? 'Taylor Brooks' : 'Mia Chen',
                    time: TimeOfDay.now().format(context),
                  ),
                );
              },
              style: FilledButton.styleFrom(backgroundColor: _plum),
              child: const Text('Send request'),
            ),
          ],
        ),
      ),
    );
    quantityController.dispose();
    if (request != null && mounted) {
      setState(() => _requests.insert(0, request));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Restock request sent to the admin.')),
      );
    }
  }

  Future<void> _showRoleMenu() async {
    final selectedRole = await showModalBottomSheet<UserRole>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Switch demo role',
                style: TextStyle(
                  color: _ink,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 13),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFF0E8DC),
                  child: Icon(Icons.person_outline, color: _amber),
                ),
                title: const Text('Taylor Brooks'),
                subtitle: const Text('Admin · Sales & approvals'),
                onTap: () => Navigator.pop(context, UserRole.admin),
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFE5EDE7),
                  child: Icon(Icons.local_cafe_outlined, color: _green),
                ),
                title: const Text('Mia Chen'),
                subtitle: const Text('Barista · Orders & restock requests'),
                onTap: () => Navigator.pop(context, UserRole.barista),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: _muted),
                title: const Text('Log out'),
                onTap: () {
                  Navigator.pop(context);
                  _logout();
                },
              ),
            ],
          ),
        ),
      ),
    );
    if (selectedRole != null && mounted) {
      setState(() {
        _role = selectedRole;
        _section = CafeSection.overview;
      });
    }
  }
}

class _StatData {
  const _StatData(this.label, this.value, this.change, this.icon, this.color);

  final String label;
  final String value;
  final String change;
  final IconData icon;
  final Color color;
}

class _VoodooBackdrop extends StatelessWidget {
  const _VoodooBackdrop({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const CustomPaint(painter: _VoodooBackdropPainter()),
        child,
      ],
    );
  }
}

class _VoodooBackdropPainter extends CustomPainter {
  const _VoodooBackdropPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = _paper);
    _glow(canvas, Offset(size.width * 0.18, size.height * 0.32), 290,
        const Color(0xFFB32D83));
    _glow(canvas, Offset(size.width * 0.78, size.height * 0.62), 340,
        const Color(0xFF315EA8));
    _glow(canvas, Offset(size.width * 0.48, size.height * 0.93), 220,
        const Color(0xFF398A52));

    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    for (var index = 0; index < 5; index++) {
      ringPaint.color = [
        const Color(0x32EF4CAF),
        const Color(0x2F67C3F5),
        const Color(0x2D9AEF79),
        const Color(0x2FF0C65A),
        const Color(0x2CB789F4),
      ][index];
      final rect = Rect.fromCenter(
        center: Offset(size.width * 0.73, size.height * 0.28),
        width: size.width * (0.25 + index * 0.07),
        height: size.width * (0.25 + index * 0.07),
      );
      canvas.drawArc(rect, index * 0.75, 4.1, false, ringPaint);
    }

    final watermark = TextPainter(
      text: TextSpan(
        text: 'VOODOO',
        style: TextStyle(
          color: const Color(0xFFFFFFFF).withValues(alpha: 0.045),
          fontSize: (size.width * 0.11).clamp(42, 150),
          fontWeight: FontWeight.w900,
          letterSpacing: 4,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: size.width);
    canvas.save();
    canvas.translate(
      (size.width - watermark.width) / 2,
      (size.height - watermark.height) / 2,
    );
    canvas.rotate(-0.08);
    watermark.paint(canvas, Offset.zero);
    canvas.restore();

    final specklePaint = Paint();
    for (var index = 0; index < 30; index++) {
      final x = (index * 97.0 + 29) % size.width;
      final y = (index * 163.0 + 41) % size.height;
      specklePaint.color = [
        const Color(0xA8E84BAE),
        const Color(0xA86AC4F2),
        const Color(0xA8A3E883),
        const Color(0xA8F0C85F),
      ][index % 4]
          .withValues(alpha: 0.33);
      canvas.drawCircle(Offset(x, y), index % 3 == 0 ? 2 : 1.2, specklePaint);
    }
  }

  void _glow(Canvas canvas, Offset center, double radius, Color color) {
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [color.withValues(alpha: 0.27), color.withValues(alpha: 0)],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(covariant _VoodooBackdropPainter oldDelegate) => false;
}

class _SalesRingPainter extends CustomPainter {
  const _SalesRingPainter();

  @override
  void paint(Canvas canvas, Size size) {
    const segments = [
      (0.44, Color(0xFF80E08E)),
      (0.31, Color(0xFF75B9F2)),
      (0.25, Color(0xFFB88BE8)),
    ];
    final strokeWidth = size.shortestSide * 0.19;
    final rect = Rect.fromLTWH(
      strokeWidth / 2,
      strokeWidth / 2,
      size.width - strokeWidth,
      size.height - strokeWidth,
    );
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;
    var start = -1.5708;
    const gap = 0.045;
    for (final segment in segments) {
      final sweep = segment.$1 * 6.28318 - gap;
      paint.color = segment.$2;
      canvas.drawArc(rect, start, sweep, false, paint);
      start += segment.$1 * 6.28318;
    }
  }

  @override
  bool shouldRepaint(covariant _SalesRingPainter oldDelegate) => false;
}
