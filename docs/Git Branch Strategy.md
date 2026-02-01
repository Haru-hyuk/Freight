## 🌿 브랜치 전략 안내

### 📌 기본 원칙

- **개발 기준 브랜치: `develop`**
- **배포 전용 브랜치: `main`**
- 평소 개발은 `main`을 사용하지 않습니다.

---

### 🌱 브랜치 종류

#### `feature/*`
- 기능 개발 브랜치
- 기능 1개 = 브랜치 1개
- `develop`에서 생성 → 작업 → `develop`으로 PR

**예시**
`feature/auth-login feature/cargo-create feature/driver-vehicle feature/admin-matching`

---

#### `fix/*`
- 버그 수정 브랜치
- `develop`에서 생성 → 수정 → `develop`으로 PR
- 
**예시**
`fix/exception-handling fix/db-long-to-int`

---

#### `chore/*`
- 기능 외 작업 (설정, 리팩토링, 구조 정리 등)
- `develop`에서 생성 → 작업 → `develop`으로 PR

**예시**
`chore/project-config chore/api-structure`

---

### 🔄 작업 흐름
```
develop  
├─ feature/*  
├─ fix/*  
└─ chore/*         
		↓     
	PR → develop         
	    ↓     
	(배포 시)        
		↓       
	develop → main
```


---

### ❌ 주의 사항

- `feature / fix / chore` → `main` 직접 PR ❌
- `main`에서 직접 작업 ❌

---

### 📝 PR / 커밋 규칙 (간단)

- PR 제목 예시

`[FE] 화물 접수 기능 추가 [BE] 기사 차량 등록 API [FIX] 예외 처리 오류 수정`

- 커밋 메시지 타입

`feat: 기능 추가 fix: 버그 수정 chore: 설정/환경 docs: 문서 refactor: 리팩토링`

---

### ✅ 한 줄 요약

> **개발은 `develop`, 배포는 `main`**  
> 모든 작업은 `develop` 기준으로 진행합니다.