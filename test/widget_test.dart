import 'dart:ui' show Size;

import 'package:flutter/foundation.dart' show ValueKey;
import 'package:flutter_test/flutter_test.dart';
import 'package:voodoo_integration_system/main.dart';

void main() {
  testWidgets('admin dashboard opens with shift and restock summaries',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const CafeManagementApp());
    await _loginAs(tester, UserRole.admin);

    expect(find.text('Shift performance'), findsOneWidget);
    expect(find.text('Restock approvals'), findsOneWidget);
    expect(find.text('Taylor Brooks'), findsOneWidget);
  });

  testWidgets(
      'logout shows shift sales and each order before returning to login',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const CafeManagementApp());
    await _loginAs(tester, UserRole.barista);
    await tester.tap(find.byKey(const ValueKey('section-pos')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Oat latte').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Complete sale'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Log out'));
    await tester.pumpAndSettle();

    expect(find.text('Shift summary'), findsOneWidget);
    expect(find.text('\$47.75'), findsOneWidget);
    expect(find.text('#1049'), findsOneWidget);
    expect(find.text('1 × Oat latte'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('return-to-login')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('login-button')), findsOneWidget);
  });

  testWidgets('POS sales update stock and admins can approve restocks',
      (tester) async {
    tester.view.physicalSize = const Size(1280, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const CafeManagementApp());
    await _loginAs(tester, UserRole.admin);
    await tester.tap(find.text('Taylor Brooks'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Barista · Orders & restock requests'));
    await tester.pumpAndSettle();

    expect(find.text('Mia Chen'), findsOneWidget);
    await tester.tap(find.text('Point of sale'));
    await tester.pumpAndSettle();
    expect(find.text('Current order'), findsOneWidget);

    await tester.tap(find.text('Oat latte').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Complete sale'));
    await tester.pumpAndSettle();
    expect(find.text('#1049'), findsOneWidget);

    await tester.tap(find.text('Inventory').first);
    await tester.pumpAndSettle();
    expect(find.text('23 cups'), findsOneWidget);
    await tester.tap(find.text('Request stock'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Send request'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Mia Chen'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Admin · Sales & approvals'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Restock requests'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Approve request').first);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Inventory').first);
    await tester.pumpAndSettle();
    expect(find.text('33 cups'), findsOneWidget);
  });

  testWidgets('dashboard sections fit phone and tablet sizes', (tester) async {
    for (final size in [
      const Size(360, 800),
      const Size(800, 1280),
      const Size(1280, 800),
    ]) {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      await tester.pumpWidget(CafeManagementApp(key: ValueKey(size)));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: 'Login at $size');
      await _loginAs(tester, UserRole.admin);
      expect(tester.takeException(), isNull, reason: 'Overview at $size');

      for (final section in [
        CafeSection.pos,
        CafeSection.orders,
        CafeSection.inventory,
        CafeSection.restocks,
        CafeSection.analytics,
      ]) {
        final destination = find.byKey(ValueKey('section-${section.name}'));
        await tester.ensureVisible(destination);
        await tester.tap(destination);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull,
            reason: '${section.name} at $size');
      }
    }

    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  });
}

Future<void> _loginAs(WidgetTester tester, UserRole role) async {
  await tester.enterText(
    find.byKey(const ValueKey('username-field')),
    role == UserRole.admin ? 'taylor' : 'mia',
  );
  await tester.enterText(
    find.byKey(const ValueKey('password-field')),
    'demo',
  );
  await tester.tap(find.byKey(ValueKey('role-${role.name}')));
  await tester.tap(find.byKey(const ValueKey('login-button')));
  await tester.pumpAndSettle();
}
