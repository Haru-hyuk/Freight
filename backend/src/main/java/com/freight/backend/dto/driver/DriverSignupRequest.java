package com.freight.backend.dto.driver;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DriverSignupRequest {

    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 8, max = 100, message = "비밀번호는 8자 이상이어야 합니다")
    @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d).*$", message = "비밀번호는 영문과 숫자를 포함해야 합니다")
    private String password;

    @NotBlank(message = "이름은 필수입니다")
    @Size(min = 2, max = 50, message = "이름은 2자 이상 50자 이하이어야 합니다")
    private String name;

    @NotBlank(message = "전화번호는 필수입니다")
    @Pattern(regexp = "^01[0-9]-?\\d{3,4}-?\\d{4}$", message = "올바른 전화번호 형식이 아닙니다")
    private String phone;

    @NotBlank(message = "주소는 필수입니다")
    private String address;

    private String addressDetail;

    @NotBlank(message = "은행명은 필수입니다")
    private String bankName;

    @NotBlank(message = "계좌번호는 필수입니다")
    @Pattern(regexp = "^\\d{10,14}$", message = "올바른 계좌번호 형식이 아닙니다")
    private String bankAccount;
}
