; Find Maximum Value - Find largest number in array
; Expected: R0 = 9 (maximum value)

.DATA
array: .WORD 3, 7, 1, 9, 2, 5
count: .WORD 6

.TEXT
    ; Load array address and count
    MOV R1, array      ; R1 = array address
    LOAD R2, count     ; R2 = count
    LOAD R0, [R1]      ; R0 = first element (initial max)
    MOV R3, #1         ; R3 = index (start from 1)
    ADD R1, #4         ; Move to second element

loop:
    CMP R3, R2         ; Compare index with count
    JZ done            ; Jump if equal (done)
    
    LOAD R4, [R1]      ; Load array[index]
    CMP R4, R0         ; Compare with current max
    JZ skip            ; Skip if equal
    JC skip            ; Skip if less (carry flag set when R4 < R0)
    
    MOV R0, R4         ; Update max
    
skip:
    ADD R1, #4         ; Move to next word
    ADD R3, #1         ; index++
    JMP loop           ; Continue loop

done:
    HALT               ; Stop execution