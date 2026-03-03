UPDATE drivers
SET password_hash = '$2a$10$HO20giSKdjFnjzJwalXmpu.JfUCajqhPLBd3LTJFjKeu0n5/3f8Se',
    name = 'driver2',
    phone = '01012341234',
    address = '서울',
    address_detail = '-',
    bank_name = '국민은행',
    bank_account = '1234567890',
    license_verified = 0,
    status = 'ACTIVE',
    updated_at = NOW()
WHERE email = 'driver2@test.com';
SELECT driver_id,email,password_hash,LENGTH(password_hash) AS len,status FROM drivers WHERE email='driver2@test.com';
